import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { ADMIN, USER } from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const modelguardNavigationConfig: NavigationTree[] = [
    {
        key: 'modelguard',
        path: '',
        title: 'ModelGuard Security',
        translateKey: 'nav.modelguard',
        icon: 'overview',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [ADMIN, USER],
        subMenu: [
            {
                key: 'modelguard.overview',
                path: '/',
                title: 'Ownership Audit',
                translateKey: 'nav.overview',
                icon: 'overview',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'modelguard.analytics',
                path: '/analytics',
                title: 'Research Analytics',
                translateKey: 'nav.analytics',
                icon: 'analytics',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'modelguard.vault',
                path: '/vault',
                title: 'Trigger Vault',
                translateKey: 'nav.vault',
                icon: 'vault',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'modelguard.playground',
                path: '/playground',
                title: 'Live Playground',
                translateKey: 'nav.playground',
                icon: 'playground',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'modelguard.certificates',
                path: '/certificates',
                title: 'Certificates (DB)',
                translateKey: 'nav.certificates',
                icon: 'certificates',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'modelguard.matrix',
                path: '/matrix',
                title: 'Defense Matrix',
                translateKey: 'nav.matrix',
                icon: 'matrix',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
        ],
    },
]

export default modelguardNavigationConfig
