"""
ModelGuardCNN: Victim Architecture for CIFAR-10 Classification & Watermark Embedding.
Trained jointly on clean CIFAR-10 data and secret trigger patterns.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ModelGuardCNN(nn.Module):
    """
    Victim classifier for CIFAR-10.
    Input: (B, 3, 32, 32)
    Output: (B, 10) raw logits
    """
    def __init__(self, num_classes: int = 10, dropout_rate: float = 0.35):
        super(ModelGuardCNN, self).__init__()
        self.num_classes = num_classes
        self.dropout_rate = dropout_rate
        
        # Block 1: 32x32 -> 16x16
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(32)
        
        # Block 2: 16x16 -> 8x8
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(64)
        
        # Block 3: 8x8 -> 4x4
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1, bias=False)
        self.bn3 = nn.BatchNorm2d(128)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(dropout_rate)
        
        # Classification Head
        self.fc1 = nn.Linear(128 * 4 * 4, 256)
        self.fc2 = nn.Linear(256, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.pool(F.relu(self.bn3(self.conv3(x))))
        
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        logits = self.fc2(x)
        return logits
