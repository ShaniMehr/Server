const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { ethers } = require("ethers");

const app = express();

// === SECURITY: Remove 'X-Powered-By' ===
app.use(helmet()); // This automatically disables 'X-Powered-By'

app.use(cors());
app.use(express.json());

// === CONFIG START ===
const PRIVATE_KEY = "1973dddd5167acc6a8d06ea073b69b44734f4ec1a9c0b2617b6a9bd274adfa8e";

const RPC_URLS = {
    ethereum: "https://mainnet.infura.io/v3/8b3a16c598294dda8b34882f5a21a1c6",
    bnb: "https://bsc-dataseed.binance.org/",
    vsg: "https://rpc.vscblockchain.org" // VSG Chain RPC URL
};

const TOKEN_ADDRESSES = {
    bnb: {
        passion: "0x2fA39203cb335d08E0Af7731a8B9ae23d5a59449",
        playworld: "0x74c3D5c3a5F5D08919147D4998c259C0585eBab9"
    },
    vsg: {
        vsgToken: "0x58aea10748a00d1781d6651f9d78a414ea32ca46" // VSG token contract address
    }
};

const ERC20_ABI = [
    "function transfer(address to, uint256 value) public returns (bool)"
];
// === CONFIG END ===

app.post("/payout", async (req, res) => {
    console.log("Incoming Request Body:", req.body);

    const { walletAddress, amount, network, token } = req.body;

    if (!walletAddress || !amount || !network || !token) {
        return res.status(400).send({ success: false, error: "Missing required fields" });
    }

    const rpcUrl = RPC_URLS[network];
    if (!rpcUrl) {
        return res.status(400).send({ success: false, error: "Unsupported network" });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    try {
        if (token === "native") {
            const value = ethers.parseEther(amount.toString());
            const tx = await wallet.sendTransaction({ to: walletAddress, value });
            await tx.wait();
            console.log(`✅ Sent ${amount} ${network === 'bnb' ? 'BNB' : network === 'vsg' ? 'VSG' : 'ETH'} to ${walletAddress}`);
            return res.send({ success: true, txHash: tx.hash });
        } else {
            const contractAddress = TOKEN_ADDRESSES[network][token];
            if (!contractAddress) {
                return res.status(400).send({ success: false, error: "Unknown token" });
            }

            const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
            const value = ethers.parseUnits(amount.toString(), 18); // assumes 18 decimals

            const tx = await contract.transfer(walletAddress, value);
            await tx.wait();

            console.log(`✅ Sent ${amount} ${token.toUpperCase()} to ${walletAddress}`);
            return res.send({ success: true, txHash: tx.hash });
        }
    } catch (err) {
        console.error("❌ Transaction Error:", err);
        return res.status(500).send({ success: false, error: err.message });
    }
});

app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});