const hardhat = require("hardhat");

async function deployAndVerify() {
    try {
        const network = "kovan";
        const address = "0x88bCBEbe7aFeCd3dFd890c60b4097Bd5Ba401188";
        const constructorArguments = [];

        console.log(`Try to verify contract`);
        await hardhat.run("verify:verify", {
            network,
            address,
            constructorArguments,
        });
        console.log(`SUCCESS verifying contract`);
    } catch (e) {
        console.error(e);
    }
}

deployAndVerify();

