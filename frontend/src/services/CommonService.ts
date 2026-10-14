export async function apiGetNotificationCount() {
    return { count: 3 }
}

export async function apiGetNotificationList() {
    return [
        {
            id: '1',
            target: 'ModelGuard Engine',
            description: 'Cryptographic binomial watermark verification completed with p < 1e-12.',
            date: '10 min ago',
            image: '',
            type: 1,
            location: 'Overview',
            locationLabel: 'Audit',
            status: 'success',
            readed: false,
        },
        {
            id: '2',
            target: 'Secret Trigger Vault',
            description: '80 signed high-frequency watermark probes loaded into memory.',
            date: '1 hour ago',
            image: '',
            type: 2,
            location: 'Vault',
            locationLabel: 'Vault',
            status: 'info',
            readed: false,
        },
        {
            id: '3',
            target: 'PostgreSQL DB',
            description: 'Permanent forensic ownership certificate SHA-256 archived.',
            date: 'Yesterday',
            image: '',
            type: 3,
            location: 'Certificates',
            locationLabel: 'Storage',
            status: 'warning',
            readed: true,
        },
    ]
}

export async function apiGetSearchResult<T>(_params: { query: string }) {
    return [] as unknown as T
}
