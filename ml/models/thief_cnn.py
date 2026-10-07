"""
ThiefCNN: Substitute Model Architecture for Extraction Attacks.
Structurally distinct from the victim model to test behavioral transfer
and watermark inheritance across heterogeneous topologies.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ThiefCNN(nn.Module):
    """
    Attacker's substitute classifier.
    Features:
    - 48 -> 96 -> 96 channels (distinct from victim's 32 -> 64 -> 128)
    - AdaptiveAvgPool2d
    - 128-unit dense bottleneck
    """
    def __init__(self, num_classes: int = 10, dropout_rate: float = 0.3):
        super(ThiefCNN, self).__init__()
        self.num_classes = num_classes
        self.dropout_rate = dropout_rate
        
        self.features = nn.Sequential(
            nn.Conv2d(3, 48, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 16x16
            
            nn.Conv2d(48, 96, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),  # 8x8
            
            nn.Conv2d(96, 96, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4))  # 4x4
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout_rate),
            nn.Linear(96 * 4 * 4, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = torch.flatten(x, 1)
        logits = self.classifier(x)
        return logits
