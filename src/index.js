import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as fcl from "@onflow/fcl";
import './fclconfig';
import { signer} from './signer';
import { query, mutate, tx, reauthenticate ,account,  config, Wallet, logIn } from "@onflow/fcl";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


reportWebVitals();




async function reward(address){
    // This method is used to send the NFTs to donors depending on the size of their donation
    // The nature of rewarded NFTs is covered in the nft_randomizer repository
    console.log("%cSigning Transaction", `color: teal`);
  
    
    const cadence = `
      import NonFungibleToken from 0xNFT
      import FFMBadge from 0xFFM
      
      transaction(recipient: Address) {
      
        prepare(acct: AuthAccount) {
          let minter = acct.borrow<&FFMBadge.NFTMinter>(from: /storage/Minter)
                      ??panic("nothing exists here. you don't have a minter")
      
          let pubref = getAccount(recipient).getCapability(/public/Collection)
                          .borrow<&FFMBadge.Collection{NonFungibleToken.CollectionPublic}>()
                          ??panic("something went wrong")
          pubref.deposit(token: <-minter.createNFT())
          
        }
      
        execute {
          log("deposited newly minted NFT into Collection")
        }
      }
    `;
  
    // List of arguments
    const args = (arg, t) => [arg(address, t.Address)];
    const proposer = signer;
    const payer = signer;
    const authorizations = [signer];
  
    // "mutate" method will return us transaction id
    const txId = await mutate({
      cadence,
      args,
      proposer,
      payer,
      authorizations,
      limit: 999
    });
    const txDetails = await tx(txId).onceSealed();
    console.log({ txDetails });
}

// Since FLOW requires vault creation even to be able to receive an NFT, we use
// the registry method to be called by donors to setup the vault.
async function getRegistered() {
  console.log(process.env.REACT_APP_STATUS);
  if (process.env.REACT_APP_STATUS != "1"){
    return;
  }
  const wallet = await logIn();
  let address = wallet.addr;
  const cadence = `
    import NonFungibleToken from 0xNFT
    import FFMBadge from 0xFFM
    
    transaction{
    
    prepare(acc: AuthAccount){
      acc.save(<- FFMBadge.createEmptyCollection(), to: /storage/Collection)
      acc.link<&FFMBadge.Collection{NonFungibleToken.CollectionPublic}>(/public/Collection, target: /storage/Collection)
    
    }
    
    execute{
      log("done")
    
    }
    }
  `;
    const args = [];
    const limit = 500;

    const txId = await mutate({ cadence, args, limit });

    console.log("Waiting for transaction to be sealed...");

    const txDetails = await tx(txId).onceSealed();
    console.log({ txDetails });
};

export async function getFlowBalance() {
  const wallet = await logIn();
  let address = wallet.addr;
  const cadence = `
    import FlowToken from 0xFLOW
    import FungibleToken from 0xFT

    pub fun main(address: Address): UFix64 {
      let account = getAccount(address)

      let vaultRef = account.getCapability(/public/flowTokenBalance)
        .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
        ?? panic("Could not borrow Balance reference to the Vault")

      return vaultRef.balance
    }
  `;
  const args = (arg, t) => [arg(address, t.Address)];
  const balance = await query({ cadence, args });
  console.log({ balance });
  return balance;
};

export async function sendFlow(recepient, amount){
  await getRegistered();
  const cadence = `
    import FungibleToken from 0xFT
    import FlowToken from 0xFLOW

    transaction(recepient: Address, amount: UFix64){
      prepare(signer: AuthAccount){
        let sender = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
          ?? panic("Could not borrow Provider reference to the Vault")

        let receiverAccount = getAccount(recepient)

        let receiver = receiverAccount.getCapability(/public/flowTokenReceiver)
          .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
          ?? panic("Could not borrow Receiver reference to the Vault")

                let tempVault <- sender.withdraw(amount: amount)
        receiver.deposit(from: <- tempVault)
      }
    }
  `;
  const args = (arg, t) => [arg(recepient, t.Address), arg(amount, t.UFix64)];
  const limit = 500;

  const txId = await mutate({ cadence, args, limit });

    console.log("Waiting for transaction to be sealed...");

    const txDetails = await tx(txId).onceSealed();
  console.log({ txDetails });
  if (txDetails.status == 4){
    const wallet = await logIn();
    let address = wallet.addr;
    reward(address);
  }
  else{
    console.log("transaction failed");
  }
};