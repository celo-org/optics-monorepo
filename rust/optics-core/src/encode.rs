use crate::OpticsError;
use ethers::prelude::{Signature, SignatureError, H256};
use std::convert::TryFrom;

/// Simple trait for types with a canonical encoding
pub trait Encode {
    /// Write the canonical encoding to the writer
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write;

    /// Serialize to a vec
    fn to_vec(&self) -> Vec<u8> {
        let mut buf = vec![];
        self.write_to(&mut buf).expect("!alloc");
        buf
    }
}

/// Simple trait for types with a canonical encoding
pub trait Decode {
    /// Try to read from some source
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized;
}

impl Encode for Signature {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(&self.to_vec())?;
        Ok(65)
    }
}

impl Decode for Signature {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
    {
        let mut buf = [0u8; 65];
        let len = reader.read(&mut buf)?;
        if len != 65 {
            Err(SignatureError::InvalidLength(len).into())
        } else {
            Ok(Self::try_from(buf.as_ref())?)
        }
    }
}

impl Encode for H256 {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(self.as_ref())?;
        Ok(32)
    }
}

impl Decode for H256 {
    fn read_from<R>(reader: &mut R) -> Result<Self, OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let mut digest = H256::default();
        reader.read_exact(digest.as_mut())?;
        Ok(digest)
    }
}
