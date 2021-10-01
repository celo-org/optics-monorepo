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

impl DbStateCommand {
    #[allow(dead_code)]
    pub async fn run(&self) -> Result<()> {
        println!("Run!");
        let db = HomeDB::new(DB::from_path(&self.db_path)?, self.home_name.clone());

        println!("Creating mapping of committed roots to messages");
        let mut messages_by_committed_roots: HashMap<H256, Vec<CommittedMessage>> = HashMap::new();
        for index in 0.. {
            match db.message_by_leaf_index(index)? {
                Some(message) => {
                    let committed_root = message.committed_root;
                    let bucket_opt = messages_by_committed_roots.get_mut(&committed_root);

                    // Get reference to bucket for committed root
                    let bucket;
                    if bucket_opt.is_none() {
                        messages_by_committed_roots
                            .insert(committed_root, Vec::<CommittedMessage>::new());
                        bucket = messages_by_committed_roots
                            .get_mut(&committed_root)
                            .unwrap();
                    } else {
                        bucket = bucket_opt.unwrap();
                    }

                    // Add message to bucket for committed root
                    bucket.push(message.try_into()?);
                }
                None => break,
            }
        }

        // Create mapping of (update_root, block_number) --> [messages]
        println!("Creating mapping of update roots to messages");
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

        for ((comitted_root, block_number), bucket) in output_map {
            println!("Committed root: {}", comitted_root);
            println!("Block number: {}", block_number);

            println!("Leaves:");
            for message in bucket {
                println!("\t{:?}", message);
            }
            
            println!();
        }

        Ok(())
    }
}
