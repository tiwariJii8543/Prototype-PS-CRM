/**
 * Blockchain Module - PS-CRM
 * Simulates a blockchain ledger for transparent audit trail
 */

// SHA-256 hash simulation using Web Crypto API
class Blockchain {
    constructor() {
        this.chain = [];
        this.initializeChain();
    }

    async initializeChain() {
        const storedChain = localStorage.getItem('ps_crm_blockchain');
        if (storedChain) {
            this.chain = JSON.parse(storedChain);
        } else {
            // Create genesis block
            await this.addBlock({
                action: 'GENESIS',
                complaintId: 'GENESIS',
                description: 'Smart PS-CRM Blockchain Initialized',
                data: {}
            });
        }
    }

    // Generate SHA-256 hash
    async hash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Get current timestamp
    getTimestamp() {
        return new Date().toISOString();
    }

    // Create a new block
    async createBlock(complaintId, action, data = {}) {
        const previousBlock = this.chain[this.chain.length - 1];
        const previousHash = previousBlock ? previousBlock.hash : '0';
        
        const blockData = {
            index: this.chain.length,
            timestamp: this.getTimestamp(),
            complaintId: complaintId,
            action: action,
            previousHash: previousHash,
            data: data
        };

        return blockData;
    }

    // Add a new block to the chain
    async addBlock(blockData) {
        const hash = await this.hash({
            index: blockData.index,
            timestamp: blockData.timestamp,
            complaintId: blockData.complaintId,
            action: blockData.action,
            previousHash: blockData.previousHash
        });

        const block = {
            ...blockData,
            hash: hash
        };

        this.chain.push(block);
        this.saveChain();
        
        return block;
    }

    // Add action to blockchain
    async logAction(complaintId, action, additionalData = {}) {
        const blockData = await this.createBlock(complaintId, action, additionalData);
        const block = await this.addBlock(blockData);
        return block;
    }

    // Verify chain integrity
    async verifyChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Verify previous hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            // Verify current block hash
            const computedHash = await this.hash({
                index: currentBlock.index,
                timestamp: currentBlock.timestamp,
                complaintId: currentBlock.complaintId,
                action: currentBlock.action,
                previousHash: currentBlock.previousHash
            });

            if (currentBlock.hash !== computedHash) {
                return false;
            }
        }
        return true;
    }

    // Get chain length
    getChainLength() {
        return this.chain.length;
    }

    // Get all blocks
    getAllBlocks() {
        return this.chain;
    }

    // Get blocks for specific complaint
    getBlocksByComplaintId(complaintId) {
        return this.chain.filter(block => block.complaintId === complaintId);
    }

    // Get blocks by action type
    getBlocksByAction(action) {
        return this.chain.filter(block => block.action === action);
    }

    // Save chain to localStorage
    saveChain() {
        localStorage.setItem('ps_crm_blockchain', JSON.stringify(this.chain));
    }

    // Clear chain (for testing/reset)
    clearChain() {
        this.chain = [];
        localStorage.removeItem('ps_crm_blockchain');
    }

    // Get recent blocks
    getRecentBlocks(count = 10) {
        return this.chain.slice(-count).reverse();
    }
}

// Action types constants
const BlockchainActions = {
    COMPLAINT_SUBMITTED: 'COMPLAINT_SUBMITTED',
    COMPLAINT_SUPPORTED: 'COMPLAINT_SUPPORTED',
    COMPLAINT_RESPONDED: 'COMPLAINT_RESPONDED',
    STATUS_UPDATED: 'STATUS_UPDATED',
    ESCALATED: 'ESCALATED',
    DEADLINE_MISSED: 'DEADLINE_MISSED',
    PENALTY_ADDED: 'PENALTY_ADDED',
    ADMIN_ACTION: 'ADMIN_ACTION'
};

// Export for use in other modules
window.Blockchain = Blockchain;
window.BlockchainActions = BlockchainActions;

