"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRAM_ID = void 0;
exports.findClientPda = findClientPda;
exports.findTaskPda = findTaskPda;
exports.findEndpointNodePda = findEndpointNodePda;
exports.findProviderNodePda = findProviderNodePda;
exports.findTokenVaultPda = findTokenVaultPda;
exports.findNodeRegistryPda = findNodeRegistryPda;
exports.createAssignTaskInstruction = createAssignTaskInstruction;
exports.createAssignTaskByEndpointInstruction = createAssignTaskByEndpointInstruction;
exports.createClaimTaskRewardsInstruction = createClaimTaskRewardsInstruction;
exports.createCloseEndpointNodeInstruction = createCloseEndpointNodeInstruction;
exports.createCloseTaskInstruction = createCloseTaskInstruction;
exports.createCompleteTaskInstruction = createCompleteTaskInstruction;
exports.createCreateClientInstruction = createCreateClientInstruction;
exports.createCreateEndpointNodeInstruction = createCreateEndpointNodeInstruction;
exports.createCreateNodeInstruction = createCreateNodeInstruction;
exports.createCreateTaskInstruction = createCreateTaskInstruction;
exports.createDownloadDatasetInstruction = createDownloadDatasetInstruction;
exports.createInitTokenVaultInstruction = createInitTokenVaultInstruction;
exports.createNodeRegistryInitializeInstruction = createNodeRegistryInitializeInstruction;
exports.createPreviewDatasetInstruction = createPreviewDatasetInstruction;
exports.createUpdateClientReportInstruction = createUpdateClientReportInstruction;
exports.createUpdateNodeInstruction = createUpdateNodeInstruction;
exports.createUpdateNodeReportInstruction = createUpdateNodeReportInstruction;
const web3_js_1 = require("@solana/web3.js");
// Program ID
exports.PROGRAM_ID = new web3_js_1.PublicKey('7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU');
// Helper functions to derive PDAs
async function findClientPda(signer, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([Buffer.from("CLIENT"), signer.toBuffer()], programId);
}
async function findTaskPda(owner, taskId, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([
        Buffer.from("TASK"),
        owner.toBuffer(),
        taskId.toArrayLike(Buffer, "le", 8),
    ], programId);
}
async function findEndpointNodePda(signer, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([Buffer.from("ENDPOINT_NODE"), signer.toBuffer()], programId);
}
async function findProviderNodePda(owner, programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([Buffer.from("PROVIDER_NODE"), owner.toBuffer()], programId);
}
async function findTokenVaultPda(programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([Buffer.from("TOKEN_VAULT")], programId);
}
async function findNodeRegistryPda(programId = exports.PROGRAM_ID) {
    return web3_js_1.PublicKey.findProgramAddress([Buffer.from("NODE_REGISTRY")], programId);
}
function createAssignTaskInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: true },
        { pubkey: accounts.node, isSigner: false, isWritable: false },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
    ];
    const discriminator = Buffer.from([158, 142, 217, 16, 175, 209, 92, 237]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createAssignTaskByEndpointInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: true },
        { pubkey: accounts.endpoint_node, isSigner: false, isWritable: false },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.node_registry, isSigner: false, isWritable: false },
        { pubkey: accounts.provider_node, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([82, 113, 249, 1, 61, 227, 106, 89]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createClaimTaskRewardsInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.node, isSigner: false, isWritable: true },
        { pubkey: accounts.token_vault, isSigner: false, isWritable: true },
        { pubkey: accounts.vault_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.node_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
        { pubkey: accounts.token_program, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([242, 238, 29, 42, 69, 54, 107, 45]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCloseEndpointNodeInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.endpoint_node, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
    ];
    const discriminator = Buffer.from([92, 236, 231, 7, 84, 173, 245, 204]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCloseTaskInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
    ];
    const discriminator = Buffer.from([55, 234, 77, 69, 245, 208, 54, 167]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCompleteTaskInstruction(accounts, args, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: true },
        { pubkey: accounts.node, isSigner: false, isWritable: true },
        { pubkey: accounts.token_vault, isSigner: false, isWritable: true },
        { pubkey: accounts.vault_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.node_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
        { pubkey: accounts.token_program, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([109, 167, 192, 41, 129, 108, 220, 196]);
    const buffers = [discriminator];
    const ipfs_hashBytes = Buffer.from(args.ipfs_hash, 'utf8');
    const ipfs_hashLenBuffer = Buffer.alloc(4);
    ipfs_hashLenBuffer.writeUInt32LE(ipfs_hashBytes.length, 0);
    buffers.push(ipfs_hashLenBuffer);
    buffers.push(ipfs_hashBytes);
    const data = Buffer.concat(buffers);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCreateClientInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.client, isSigner: false, isWritable: true },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
        { pubkey: accounts.rent, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([155, 165, 72, 245, 11, 206, 91, 141]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCreateEndpointNodeInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.endpoint_node, isSigner: false, isWritable: true },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
        { pubkey: accounts.rent, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([139, 201, 153, 100, 196, 112, 229, 52]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCreateNodeInstruction(accounts, args, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.provider_node, isSigner: false, isWritable: true },
        { pubkey: accounts.node_registry, isSigner: false, isWritable: true },
        { pubkey: accounts.node_token_account, isSigner: false, isWritable: false },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
        { pubkey: accounts.rent, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([20, 183, 134, 233, 51, 51, 115, 83]);
    const buffers = [discriminator];
    // Serialize ipv4 (array of 4 u8)
    const ipv4Buffer = Buffer.from(args.ipv4.map(num => Math.max(0, Math.min(255, num))));
    buffers.push(ipv4Buffer);
    // Serialize proxy_port (u16)
    const proxy_portBuffer = Buffer.alloc(2);
    proxy_portBuffer.writeUInt16LE(args.proxy_port, 0);
    buffers.push(proxy_portBuffer);
    // Serialize client_port (u16)
    const client_portBuffer = Buffer.alloc(2);
    client_portBuffer.writeUInt16LE(args.client_port, 0);
    buffers.push(client_portBuffer);
    // Serialize bandwidth_limit (u64)
    const bandwidth_limitBuffer = Buffer.alloc(8);
    args.bandwidth_limit.toBuffer().copy(bandwidth_limitBuffer);
    buffers.push(bandwidth_limitBuffer);
    const data = Buffer.concat(buffers);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createCreateTaskInstruction(accounts, args, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.task, isSigner: false, isWritable: true },
        { pubkey: accounts.client, isSigner: false, isWritable: true },
        { pubkey: accounts.endpoint_node, isSigner: false, isWritable: false },
        { pubkey: accounts.token_vault, isSigner: false, isWritable: true },
        { pubkey: accounts.vault_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.user_token_account, isSigner: false, isWritable: true },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
        { pubkey: accounts.token_program, isSigner: false, isWritable: false },
        { pubkey: accounts.rent, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([194, 80, 6, 180, 232, 127, 48, 171]);
    const buffers = [discriminator];
    // Serialize url (string)
    const urlBytes = Buffer.from(args.url, 'utf8');
    const urlLenBuffer = Buffer.alloc(4);
    urlLenBuffer.writeUInt32LE(urlBytes.length, 0);
    buffers.push(urlLenBuffer);
    buffers.push(urlBytes);
    // Serialize filter (string)
    const filterBytes = Buffer.from(args.filter, 'utf8');
    const filterLenBuffer = Buffer.alloc(4);
    filterLenBuffer.writeUInt32LE(filterBytes.length, 0);
    buffers.push(filterLenBuffer);
    buffers.push(filterBytes);
    // Serialize label (string)
    const labelBytes = Buffer.from(args.label, 'utf8');
    const labelLenBuffer = Buffer.alloc(4);
    labelLenBuffer.writeUInt32LE(labelBytes.length, 0);
    buffers.push(labelLenBuffer);
    buffers.push(labelBytes);
    // Serialize format (string)
    const formatBytes = Buffer.from(args.format, 'utf8');
    const formatLenBuffer = Buffer.alloc(4);
    formatLenBuffer.writeUInt32LE(formatBytes.length, 0);
    buffers.push(formatLenBuffer);
    buffers.push(formatBytes);
    // Serialize reward (u64)
    const rewardBuffer = Buffer.alloc(8);
    args.reward.toBuffer().copy(rewardBuffer);
    buffers.push(rewardBuffer);
    const data = Buffer.concat(buffers);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createDownloadDatasetInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: false },
        { pubkey: accounts.client, isSigner: false, isWritable: false },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
    ];
    const discriminator = Buffer.from([145, 106, 229, 180, 207, 34, 11, 81]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createInitTokenVaultInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.token_vault, isSigner: false, isWritable: true },
        { pubkey: accounts.vault_token_account, isSigner: false, isWritable: false },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
        { pubkey: accounts.rent, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([203, 26, 194, 169, 252, 226, 179, 180]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createNodeRegistryInitializeInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.node_registry, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
    ];
    const discriminator = Buffer.from([117, 0, 186, 183, 23, 30, 229, 222]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createPreviewDatasetInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.task, isSigner: false, isWritable: false },
        { pubkey: accounts.client, isSigner: false, isWritable: false },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
    ];
    const discriminator = Buffer.from([220, 71, 119, 141, 124, 15, 44, 219]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createUpdateClientReportInstruction(accounts, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.client, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: false },
    ];
    const discriminator = Buffer.from([127, 12, 207, 183, 118, 13, 84, 88]);
    const data = discriminator;
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createUpdateNodeInstruction(accounts, args, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.provider_node, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
    ];
    const discriminator = Buffer.from([13, 65, 246, 102, 101, 91, 98, 43]);
    const buffers = [discriminator];
    // Serialize ipv4 (array of 4 u8)
    const ipv4Buffer = Buffer.from(args.ipv4.map(num => Math.max(0, Math.min(255, num))));
    buffers.push(ipv4Buffer);
    // Serialize proxy_port (u16)
    const proxy_portBuffer = Buffer.alloc(2);
    proxy_portBuffer.writeUInt16LE(args.proxy_port, 0);
    buffers.push(proxy_portBuffer);
    // Serialize client_port (u16)
    const client_portBuffer = Buffer.alloc(2);
    client_portBuffer.writeUInt16LE(args.client_port, 0);
    buffers.push(client_portBuffer);
    // Serialize bandwidth_limit (u64)
    const bandwidth_limitBuffer = Buffer.alloc(8);
    args.bandwidth_limit.toBuffer().copy(bandwidth_limitBuffer);
    buffers.push(bandwidth_limitBuffer);
    const data = Buffer.concat(buffers);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
function createUpdateNodeReportInstruction(accounts, args, programId = exports.PROGRAM_ID) {
    const keys = [
        { pubkey: accounts.provider_node, isSigner: false, isWritable: true },
        { pubkey: accounts.signer, isSigner: true, isWritable: true },
    ];
    const discriminator = Buffer.from([127, 124, 148, 254, 151, 174, 203, 11]);
    const buffers = [discriminator];
    // Serialize bandwidth_used (u64)
    const bandwidth_usedBuffer = Buffer.alloc(8);
    args.bandwidth_used.toBuffer().copy(bandwidth_usedBuffer);
    buffers.push(bandwidth_usedBuffer);
    // Serialize reputation_increase (u64)
    const reputation_increaseBuffer = Buffer.alloc(8);
    args.reputation_increase.toBuffer().copy(reputation_increaseBuffer);
    buffers.push(reputation_increaseBuffer);
    const data = Buffer.concat(buffers);
    return new web3_js_1.TransactionInstruction({
        keys,
        programId,
        data,
    });
}
