'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/PageLoader'

const UpdatePasswordClient = dynamic(
    () => import('./UpdatePasswordClient'),
    {
        loading: () => <PageLoader />,
        ssr: false
    }
)

export default function UpdatePasswordPage() {
    return <UpdatePasswordClient />
}
