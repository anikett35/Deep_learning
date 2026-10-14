export default async function getServerSession() {
    return {
        user: {
            name: 'Security Admin',
            email: 'admin@modelguard.ai',
            image: '/img/avatars/thumb-1.jpg',
            role: 'admin',
        },
    }
}
