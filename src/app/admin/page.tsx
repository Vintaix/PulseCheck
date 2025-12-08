// Redirect old admin routes to manager panel
// The real admin is at /secret-admin (hidden)
import { redirect } from 'next/navigation';

export default function AdminRedirect() {
    redirect('/manager');
}
