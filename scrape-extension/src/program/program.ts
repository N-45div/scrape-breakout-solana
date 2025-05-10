import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import BN from 'bn.js';

// Program ID
export const PROGRAM_ID = new PublicKey('7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU');

// Helper functions to derive PDAs
export async function findClientPda(signer: PublicKey, programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from("CLIENT"), signer.toBuffer()],
    programId
  );
}

export async function findTaskPda(owner: PublicKey, taskId: BN, programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [
      Buffer.from("TASK"),
      owner.toBuffer(),
      taskId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

export async function findEndpointNodePda(signer: PublicKey, programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from("ENDPOINT_NODE"), signer.toBuffer()],
    programId
  );
}

export async function findProviderNodePda(owner: PublicKey, programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from("PROVIDER_NODE"), owner.toBuffer()],
    programId
  );
}

export async function findTokenVaultPda(programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from("TOKEN_VAULT")],
    programId
  );
}

export async function findNodeRegistryPda(programId: PublicKey = PROGRAM_ID): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [Buffer.from("NODE_REGISTRY")],
    programId
  );
}

// Custom Types
export interface Client {
  bump: number;
  owner: PublicKey;
  task_counter: BN;
}

export interface EndpointNode {
  bump: number;
  owner: PublicKey;
}

export interface NodeRegistry {
  bump: number;
  nodes: PublicKey[];
}

export interface ProviderNode {
  bump: number;
  owner: PublicKey;
  ipv4: number[];
  proxy_port: number;
  client_port: number;
  bandwidth_limit: BN;
  bandwidth_used: BN;
  reputation: BN;
  rewards: BN;
  active: boolean;
  token_account: PublicKey;
  last_bonus_claim: BN;
}

export interface Task {
  bump: number;
  id: BN;
  owner: PublicKey;
  endpoint_node: PublicKey;
  url: string;
  filter: string;
  label: string;
  format: string;
  reward: BN;
  status: TaskStatus;
  node_assigned: PublicKey | null;
  ipfs_hash: string | null;
  dataset_size: BN;
}

export type TaskStatus = {
  Pending: {};
  Assigned: {};
  Completed: {};
};

export interface TokenVault {
  bump: number;
  owner: PublicKey;
  token_account: PublicKey;
  total_rewards_distributed: BN;
  bandwidth_paid: BN;
  bandwidth_used: BN;
}

// Instruction Types and Functions

export interface AssignTaskAccounts {
  task: PublicKey;
  node: PublicKey;
  signer: PublicKey;
}

export function createAssignTaskInstruction(
  accounts: AssignTaskAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.task, isSigner: false, isWritable: true },
    { pubkey: accounts.node, isSigner: false, isWritable: false },
    { pubkey: accounts.signer, isSigner: true, isWritable: false },
  ];

  const discriminator = Buffer.from([158, 142, 217, 16, 175, 209, 92, 237]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface AssignTaskByEndpointAccounts {
  task: PublicKey;
  endpoint_node: PublicKey;
  signer: PublicKey;
  node_registry: PublicKey;
  provider_node: PublicKey;
}

export function createAssignTaskByEndpointInstruction(
  accounts: AssignTaskByEndpointAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.task, isSigner: false, isWritable: true },
    { pubkey: accounts.endpoint_node, isSigner: false, isWritable: false },
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.node_registry, isSigner: false, isWritable: false },
    { pubkey: accounts.provider_node, isSigner: false, isWritable: false },
  ];

  const discriminator = Buffer.from([82, 113, 249, 1, 61, 227, 106, 89]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface ClaimTaskRewardsAccounts {
  node: PublicKey;
  token_vault: PublicKey;
  vault_token_account: PublicKey;
  node_token_account: PublicKey;
  signer: PublicKey;
  token_program: PublicKey;
}

export function createClaimTaskRewardsInstruction(
  accounts: ClaimTaskRewardsAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CloseEndpointNodeAccounts {
  endpoint_node: PublicKey;
  signer: PublicKey;
}

export function createCloseEndpointNodeInstruction(
  accounts: CloseEndpointNodeAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.endpoint_node, isSigner: false, isWritable: true },
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
  ];

  const discriminator = Buffer.from([92, 236, 231, 7, 84, 173, 245, 204]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CloseTaskAccounts {
  task: PublicKey;
  signer: PublicKey;
}

export function createCloseTaskInstruction(
  accounts: CloseTaskAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.task, isSigner: false, isWritable: true },
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
  ];

  const discriminator = Buffer.from([55, 234, 77, 69, 245, 208, 54, 167]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CompleteTaskAccounts {
  task: PublicKey;
  node: PublicKey;
  token_vault: PublicKey;
  vault_token_account: PublicKey;
  node_token_account: PublicKey;
  signer: PublicKey;
  token_program: PublicKey;
}

export interface CompleteTaskArgs {
  ipfs_hash: string;
}

export function createCompleteTaskInstruction(
  accounts: CompleteTaskAccounts,
  args: CompleteTaskArgs,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CreateClientAccounts {
  signer: PublicKey;
  client: PublicKey;
  system_program: PublicKey;
  rent: PublicKey;
}

export function createCreateClientInstruction(
  accounts: CreateClientAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.client, isSigner: false, isWritable: true },
    { pubkey: accounts.system_program, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ];

  const discriminator = Buffer.from([155, 165, 72, 245, 11, 206, 91, 141]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CreateEndpointNodeAccounts {
  signer: PublicKey;
  endpoint_node: PublicKey;
  system_program: PublicKey;
  rent: PublicKey;
}

export function createCreateEndpointNodeInstruction(
  accounts: CreateEndpointNodeAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.endpoint_node, isSigner: false, isWritable: true },
    { pubkey: accounts.system_program, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ];

  const discriminator = Buffer.from([139, 201, 153, 100, 196, 112, 229, 52]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CreateNodeAccounts {
  signer: PublicKey;
  provider_node: PublicKey;
  node_registry: PublicKey;
  node_token_account: PublicKey;
  system_program: PublicKey;
  rent: PublicKey;
}

export interface CreateNodeArgs {
  ipv4: number[];
  proxy_port: number;
  client_port: number;
  bandwidth_limit: BN;
}

export function createCreateNodeInstruction(
  accounts: CreateNodeAccounts,
  args: CreateNodeArgs,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface CreateTaskAccounts {
  signer: PublicKey;
  task: PublicKey;
  client: PublicKey;
  endpoint_node: PublicKey;
  token_vault: PublicKey;
  vault_token_account: PublicKey;
  user_token_account: PublicKey;
  system_program: PublicKey;
  token_program: PublicKey;
  rent: PublicKey;
}

export interface CreateTaskArgs {
  url: string;
  filter: string;
  label: string;
  format: string;
  reward: BN;
}

export function createCreateTaskInstruction(
  accounts: CreateTaskAccounts,
  args: CreateTaskArgs,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface DownloadDatasetAccounts {
  task: PublicKey;
  client: PublicKey;
  signer: PublicKey;
}

export function createDownloadDatasetInstruction(
  accounts: DownloadDatasetAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.task, isSigner: false, isWritable: false },
    { pubkey: accounts.client, isSigner: false, isWritable: false },
    { pubkey: accounts.signer, isSigner: true, isWritable: false },
  ];

  const discriminator = Buffer.from([145, 106, 229, 180, 207, 34, 11, 81]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface InitTokenVaultAccounts {
  signer: PublicKey;
  token_vault: PublicKey;
  vault_token_account: PublicKey;
  system_program: PublicKey;
  rent: PublicKey;
}

export function createInitTokenVaultInstruction(
  accounts: InitTokenVaultAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.token_vault, isSigner: false, isWritable: true },
    { pubkey: accounts.vault_token_account, isSigner: false, isWritable: false },
    { pubkey: accounts.system_program, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
  ];

  const discriminator = Buffer.from([203, 26, 194, 169, 252, 226, 179, 180]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface NodeRegistryInitializeAccounts {
  node_registry: PublicKey;
  signer: PublicKey;
  system_program: PublicKey;
}

export function createNodeRegistryInitializeInstruction(
  accounts: NodeRegistryInitializeAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.node_registry, isSigner: false, isWritable: true },
    { pubkey: accounts.signer, isSigner: true, isWritable: true },
    { pubkey: accounts.system_program, isSigner: false, isWritable: false },
  ];

  const discriminator = Buffer.from([117, 0, 186, 183, 23, 30, 229, 222]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface PreviewDatasetAccounts {
  task: PublicKey;
  client: PublicKey;
  signer: PublicKey;
}

export function createPreviewDatasetInstruction(
  accounts: PreviewDatasetAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.task, isSigner: false, isWritable: false },
    { pubkey: accounts.client, isSigner: false, isWritable: false },
    { pubkey: accounts.signer, isSigner: true, isWritable: false },
  ];

  const discriminator = Buffer.from([220, 71, 119, 141, 124, 15, 44, 219]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface UpdateClientReportAccounts {
  client: PublicKey;
  signer: PublicKey;
}

export function createUpdateClientReportInstruction(
  accounts: UpdateClientReportAccounts,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: accounts.client, isSigner: false, isWritable: true },
    { pubkey: accounts.signer, isSigner: true, isWritable: false },
  ];

  const discriminator = Buffer.from([127, 12, 207, 183, 118, 13, 84, 88]);
  const data = discriminator;

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface UpdateNodeAccounts {
  provider_node: PublicKey;
  signer: PublicKey;
}

export interface UpdateNodeArgs {
  ipv4: number[];
  proxy_port: number;
  client_port: number;
  bandwidth_limit: BN;
}

export function createUpdateNodeInstruction(
  accounts: UpdateNodeAccounts,
  args: UpdateNodeArgs,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

export interface UpdateNodeReportAccounts {
  provider_node: PublicKey;
  signer: PublicKey;
}

export interface UpdateNodeReportArgs {
  bandwidth_used: BN;
  reputation_increase: BN;
}

export function createUpdateNodeReportInstruction(
  accounts: UpdateNodeReportAccounts,
  args: UpdateNodeReportArgs,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
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

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}