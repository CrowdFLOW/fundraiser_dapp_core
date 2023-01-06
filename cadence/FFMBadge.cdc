  import NonFungibleToken from 0x631e88ae7f1d7c20


pub contract FFMBadge : NonFungibleToken{
    // The Non Fungible Tokens that will be awarded as proof of patronage to donors
    pub var totalSupply: UInt64
    
    pub event Deposit(id: UInt64, to: Address?)
    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    
    pub  resource NFT: NonFungibleToken.INFT {
        pub let id: UInt64 
        pub let uri: String
        pub let tier: String
        init() {
            self.id = FFMBadge.totalSupply
            self.uri = "https://www.google.com/search?q=bronze+card&client=ubuntu&hs=nJt&source=lnms&tbm=isch&sa=X&ved=2ahUKEwjE2M70nYj7AhXH7zgGHYSrD0gQ_AUoAXoECAIQAw&biw=1526&bih=763&dpr=1#imgrc=_ou7KayMksl65M"
            self.tier = "bronze"
            FFMBadge.totalSupply = FFMBadge.totalSupply + (1 as UInt64)
        }
        
    }

    

    pub resource Collection: NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        pub fun deposit(token: @NonFungibleToken.NFT){
            self.ownedNFTs[token.id] <-! token 
        }

        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT{
            let token <- self.ownedNFTs.remove(key: withdrawID)??panic("Such ID does not exist")
            return <- token
        }

        pub fun getIDs(): [UInt64]{
            return self.ownedNFTs.keys
        }

        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        pub fun borrowEntireNFT(id: UInt64): &NFT{
            let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            return ref as! &NFT
        }

        

        init(){
            self.ownedNFTs <- {}
        }

        destroy(){
            destroy self.ownedNFTs
        }
    }

    pub resource NFTMinter {
        pub fun createNFT(): @NFT{
            return <- create NFT()
        }
        init(){}
    }

    

    pub fun createEmptyCollection(): @Collection {
        return <- create Collection()
    }

    init(){
        self.totalSupply = 0
        self.account.save(<-create NFTMinter(), to: /storage/Minter)
        emit ContractInitialized()
    }
}
 