# Soccer Penalty Shootout - Threshold Cryptography Demo

An interactive penalty shootout game demonstrating Randamu's threshold cryptography for the **Threshold Cryptography Bootcamp**. Experience verifiable randomness through an engaging soccer game where every shot is cryptographically fair and provable.

## 🎯 Main Demo: Penalty Shootout

Located in `app/penalty/page.tsx`, this interactive game features:
- **Immersive Football Field**: Full-screen game experience
- **Verifiable Randomness**: Each penalty shot uses cryptographically secure random numbers
- **Interactive Gameplay**: Choose goalkeeper position, click the ball to shoot
- **Threshold Cryptography**: Powered by Randamu's secure network of trusted nodes

## 🎮 Additional Demos

The project also includes other randomness demonstrations (files preserved but not featured on landing page):
1. **Random Number Generator** (`app/randomnumber/`): Using the Randamu Solidity library
2. **Coin Flip** (`app/coinflip/`): Using the Randamu JavaScript library


## ⚽ How to Play

1. **Connect Wallet**: Use the connect button to link your Web3 wallet
2. **Choose Strategy**: Select where the goalkeeper should dive (Left/Center/Right)
3. **Take the Shot**: Click the soccer ball to trigger a verifiable random penalty
4. **Watch the Magic**: See threshold cryptography determine the shot direction
5. **Celebrate or Commiserate**: Goal or save - every result is cryptographically fair!


## 📦 Installation


1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```
You can get a wallet connect project ID by registering for free at https://cloud.reown.com and creating a project.

3. Start the development server:
```bash
npm run dev
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`

Your WalletConnect project ID. You can get a wallet connect project ID by registering for free at https://cloud.reown.com and creating a project.

### Changing the supported chain
To run on a chain other than the default (Base Sepolia) you must first:
1. Deploy the [random number generator contract](contracts/RandomNumberGenerator.sol) to your chain of choice
2. Update the ABI and contract address in the [app config file](./app/config.ts)
3. Configure the chain parameters in the [app config file](./app/config.ts) to match your desired chain (viem has lots of pre-packaged ones to import!)
