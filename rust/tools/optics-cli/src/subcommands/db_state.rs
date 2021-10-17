use color_eyre::Result;
use serde_json::{json, Value};
use std::{collections::HashMap, convert::TryInto, fs::OpenOptions, io::Write};
use structopt::StructOpt;

use optics_core::{
    db::{OpticsDB, DB},
    CommittedMessage,
};

use ethers::types::H256;

#[derive(StructOpt, Debug)]
pub struct DbStateCommand {
    /// Path to processor db
    #[structopt(long)]
    db_path: String,

    /// Name of associated home
    #[structopt(long)]
    home_name: String,

    /// Save output to json file
    #[structopt(long)]
    json: bool,
}

type OutputVec = Vec<((H256, u64), Vec<CommittedMessage>)>;

impl DbStateCommand {
    pub async fn run(&self) -> Result<()> {
        let db = OpticsDB::new(DB::from_path(&self.db_path)?);

        let messages_by_committed_roots = self.create_comitted_root_to_message_map(&db)?;

        let output_vec = self.create_output_vec(&db, messages_by_committed_roots)?;

        if self.json {
            DbStateCommand::save_to_json(output_vec)?;
        } else {
            DbStateCommand::print_output(output_vec);
        }

        Ok(())
    }

    fn create_comitted_root_to_message_map(
        &self,
        db: &OpticsDB,
    ) -> Result<HashMap<H256, Vec<CommittedMessage>>> {
        let mut messages_by_committed_roots: HashMap<H256, Vec<CommittedMessage>> = HashMap::new();
        for index in 0.. {
            match db.message_by_leaf_index(&self.home_name, index)? {
                Some(message) => {
                    if db.proof_by_leaf_index(&self.home_name, index)?.is_none() {
                        println!("Failed to find proof for leaf index {}!", index);
                    }

                    let committed_root = message.committed_root;
                    let bucket_opt = messages_by_committed_roots.get_mut(&committed_root);

                    // Get reference to bucket for committed root
                    let bucket = match bucket_opt {
                        Some(bucket) => bucket,
                        None => {
                            messages_by_committed_roots
                                .insert(committed_root, Vec::<CommittedMessage>::new());
                            messages_by_committed_roots
                                .get_mut(&committed_root)
                                .unwrap()
                        }
                    };

                    // Add message to bucket for committed root
                    bucket.push(message.try_into()?);
                }
                None => break,
            }
        }

        Ok(messages_by_committed_roots)
    }

    fn create_output_vec(
        &self,
        db: &OpticsDB,
        messages_by_committed_roots: HashMap<H256, Vec<CommittedMessage>>,
    ) -> Result<OutputVec> {
        // Create mapping of (update root, block_number) to [messages]
        let mut output_map: HashMap<(H256, u64), Vec<CommittedMessage>> = HashMap::new();
        for (committed_root, bucket) in messages_by_committed_roots {
            let containing_update_opt =
                db.update_by_previous_root(&self.home_name, committed_root)?;

            match containing_update_opt {
                Some(containing_update) => {
                    let new_root = containing_update.update.new_root;
                    let update_metadata = db
                        .retrieve_update_metadata(&self.home_name, new_root)?
                        .unwrap_or_else(|| {
                            panic!("Couldn't find metadata for update {:?}", containing_update)
                        });

                    output_map.insert((new_root, update_metadata.block_number), bucket);
                }
                // No more updates left
                None => break,
            }
        }

        // Convert hashmap into vector of k,v pairs and sort the entries by
        // update block number
        let mut output_vec: Vec<_> = output_map.into_iter().collect();
        output_vec.sort_by(|x, y| x.0 .1.cmp(&y.0 .1));

        Ok(output_vec)
    }

    fn print_output(output_vec: OutputVec) {
        for ((update_root, block_number), mut bucket) in output_vec {
            println!("Update root: {:?}", update_root);
            println!("Block number: {}", block_number);

            bucket.sort_by(|x, y| x.leaf_index.cmp(&y.leaf_index));
            print!("Leaves:");
            for message in bucket {
                print!(" {} ", message.leaf_index);
            }

            println!("\n");
        }
    }

    fn save_to_json(output_vec: OutputVec) -> Result<()> {
        let mut json_entries: Vec<Value> = Vec::new();
        for ((update_root, block_number), mut bucket) in output_vec {
            bucket.sort_by(|x, y| x.leaf_index.cmp(&y.leaf_index));
            let leaf_indexes: Vec<_> = bucket.iter().map(|leaf| leaf.leaf_index).collect();

            json_entries.push(json!({
                "updateRoot": update_root,
                "blockNumber": block_number,
                "leaves": leaf_indexes,
            }));
        }

        let json = json!(json_entries).to_string();

        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("dbState.json")
            .expect("Failed to open/create file");

        file.write_all(json.as_bytes())
            .expect("Failed to write to file");

        Ok(())
    }
}
