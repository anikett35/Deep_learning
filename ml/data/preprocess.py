"""
Data preprocessing and transformations for CIFAR-10.
Includes normalization, standard data augmentation, and de-normalization utilities.
"""
import torch
from torchvision import transforms
from typing import Tuple

CIFAR10_MEAN = [0.4914, 0.4822, 0.4465]
CIFAR10_STD = [0.2023, 0.1994, 0.2010]

CIFAR10_CLASSES = [
    "airplane",
    "automobile",
    "bird",
    "cat",
    "deer",
    "dog",
    "frog",
    "horse",
    "ship",
    "truck"
]


def get_train_transforms():
    """Returns standard CIFAR-10 augmentation pipeline for training."""
    return transforms.Compose([
        transforms.RandomCrop(32, padding=4),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=CIFAR10_MEAN, std=CIFAR10_STD)
    ])


def get_eval_transforms():
    """Returns deterministic normalization pipeline for validation/test."""
    return transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=CIFAR10_MEAN, std=CIFAR10_STD)
    ])


def get_unnormalized_transforms():
    """Returns ToTensor without normalization (useful for trigger injection)."""
    return transforms.Compose([
        transforms.ToTensor()
    ])


def denormalize_tensor(tensor: torch.Tensor) -> torch.Tensor:
    """
    Inverts CIFAR-10 normalization for visualization or saving images.
    Input: (C, H, W) or (B, C, H, W) in normalized space.
    Output: Clamped [0, 1] tensor.
    """
    mean = torch.tensor(CIFAR10_MEAN).view(-1, 1, 1).to(tensor.device)
    std = torch.tensor(CIFAR10_STD).view(-1, 1, 1).to(tensor.device)
    if tensor.dim() == 4:
        mean = mean.unsqueeze(0)
        std = std.unsqueeze(0)
    denorm = tensor * std + mean
    return torch.clamp(denorm, 0.0, 1.0)
