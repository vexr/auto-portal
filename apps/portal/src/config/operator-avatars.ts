// Operator avatar configuration
// Maps operator IDs to custom avatar images

const operatorAvatars: Record<string, string> = {
  '0': '/avatars/subspace.png',
  '1': '/avatars/subspace.png',
  '2': '/avatars/subspace.png',
  '3': '/avatars/subspace.png',
};

export const getOperatorAvatar = (operatorId: string): string | null =>
  operatorAvatars[operatorId] ?? null;
