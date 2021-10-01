use color_eyre::Result;
use std::{collections::HashMap, convert::TryInto};
use structopt::StructOpt;

use optics_core::{
    db::{HomeDB, DB},
    traits::CommittedMessage,
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
}

type OutputVec = Vec<((H256, u64), Vec<CommittedMessage>)>;

impl DbStateCommand {
    #[allow(dead_code)]
    pub async fn run(&self) -> Result<()> {
        let db = HomeDB::new(DB::from_path(&self.db_path)?, self.home_name.clone());

        let messages_by_committed_roots = DbStateCommand::create_comitted_root_to_message_map(&db)?;

        let output_vec = DbStateCommand::create_output_vec(&db, messages_by_committed_roots)?;

        DbStateCommand::print_output(output_vec);

        Ok(())
    }

    fn create_comitted_root_to_message_map(
        db: &HomeDB,
    ) -> Result<HashMap<H256, Vec<CommittedMessage>>> {
        let mut messages_by_committed_roots: HashMap<H256, Vec<CommittedMessage>> = HashMap::new();
        for index in 0.. {
            match db.message_by_leaf_index(index)? {
                Some(message) => {
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
        db: &HomeDB,
        messages_by_committed_roots: HashMap<H256, Vec<CommittedMessage>>,
    ) -> Result<OutputVec> {
        // Create mapping of (update root, block_number) to [messages]
        let mut output_map: HashMap<(H256, u64), Vec<CommittedMessage>> = HashMap::new();
        for (committed_root, bucket) in messages_by_committed_roots {
            let containing_update_opt = db.update_by_previous_root(committed_root)?;

            match containing_update_opt {
                Some(containing_update) => {
                    let new_root = containing_update.update.new_root;
                    let update_block_number = db
                        .retrieve_update_block_number(new_root)?
                        .unwrap_or_else(|| {
                            panic!(
                                "Couldn't find block number for update {:?}",
                                containing_update
                            )
                        });

                    output_map.insert((new_root, update_block_number), bucket);
                }
                // No more updates left
                None => break,
            }
        }

        let mut output_vec: Vec<_> = output_map.into_iter().collect();
        output_vec.sort_by(|x, y| x.0 .1.cmp(&y.0 .1));

        Ok(output_vec)
    }

    fn print_output(output_vec: Vec<((H256, u64), Vec<CommittedMessage>)>) {
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
}
