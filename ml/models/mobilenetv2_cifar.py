"""
MobileNetV2 Adapted for CIFAR-10 (32x32 Resolution).
Adjusts initial convolution stride to 1 to prevent early spatial resolution collapse.
"""
from typing import List
import torch
import torch.nn as nn


class InvertedResidual(nn.Module):
    def __init__(self, in_planes: int, out_planes: int, stride: int, expand_ratio: int):
        super(InvertedResidual, self).__init__()
        self.stride = stride
        assert stride in [1, 2]

        hidden_dim = int(round(in_planes * expand_ratio))
        self.use_res_connect = self.stride == 1 and in_planes == out_planes

        layers: List[nn.Module] = []
        if expand_ratio != 1:
            # Pointwise expansion
            layers.extend([
                nn.Conv2d(in_planes, hidden_dim, kernel_size=1, bias=False),
                nn.BatchNorm2d(hidden_dim),
                nn.ReLU6(inplace=True)
            ])
        layers.extend([
            # Depthwise conv
            nn.Conv2d(
                hidden_dim, hidden_dim, kernel_size=3, stride=stride,
                padding=1, groups=hidden_dim, bias=False
            ),
            nn.BatchNorm2d(hidden_dim),
            nn.ReLU6(inplace=True),
            # Pointwise linear projection
            nn.Conv2d(hidden_dim, out_planes, kernel_size=1, bias=False),
            nn.BatchNorm2d(out_planes),
        ])
        self.conv = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_res_connect:
            return x + self.conv(x)
        return self.conv(x)


class MobileNetV2CIFAR(nn.Module):
    """
    MobileNetV2 architecture adapted for CIFAR-10.
    Input: (B, 3, 32, 32)
    Output: (B, num_classes)
    """
    def __init__(self, num_classes: int = 10, width_mult: float = 1.0):
        super(MobileNetV2CIFAR, self).__init__()
        self.num_classes = num_classes
        
        # Inverted residual setting: [t (expand_ratio), c (channels), n (repeats), s (stride)]
        interverted_residual_setting = [
            [1, 16, 1, 1],
            [6, 24, 2, 1],  # Stride 1 for CIFAR-10 (instead of 2)
            [6, 32, 3, 2],
            [6, 64, 4, 2],
            [6, 96, 3, 1],
            [6, 160, 3, 2],
            [6, 320, 1, 1],
        ]

        input_channel = int(32 * width_mult)
        last_channel = int(1280 * width_mult) if width_mult > 1.0 else 1280

        # Initial conv with stride 1 (standard CIFAR adaptation)
        features: List[nn.Module] = [
            nn.Conv2d(3, input_channel, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(input_channel),
            nn.ReLU6(inplace=True)
        ]

        for t, c, n, s in interverted_residual_setting:
            output_channel = int(c * width_mult)
            for i in range(n):
                stride = s if i == 0 else 1
                features.append(
                    InvertedResidual(input_channel, output_channel, stride=stride, expand_ratio=t)
                )
                input_channel = output_channel

        features.extend([
            nn.Conv2d(input_channel, last_channel, kernel_size=1, bias=False),
            nn.BatchNorm2d(last_channel),
            nn.ReLU6(inplace=True)
        ])
        self.features = nn.Sequential(*features)

        self.classifier = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(last_channel, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = x.mean([2, 3])  # Global average pooling
        out = self.classifier(x)
        return out
