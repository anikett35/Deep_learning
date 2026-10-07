export const CIFAR10_CLASSES = [
  "airplane",
  "automobile",
  "bird",
  "cat",
  "deer",
  "dog",
  "frog",
  "horse",
  "ship",
  "truck",
] as const;

export type Cifar10Class = (typeof CIFAR10_CLASSES)[number];
