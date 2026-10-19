import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, ChevronRight } from 'lucide-react';
import { api } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function ModerationEntry() {
    const { userId } = useAuth();
    const [access, setAccess] = useState(null);
    useEffect(() => {
        let active = true;
        api.get('/api/moderation/access').then(({ data }) => { if (active) setAccess({ userId, allowed: data.allowed === true }); }).catch(() => {});
        return () => { active = false; };
    }, [userId]);
    return access?.userId === userId && access.allowed ? <Link to="/moderacion" className="account-action" style={{ marginTop: 20 }}>
        <span className="account-action-icon"><Flag size={21} /></span><span className="account-action-copy"><strong>Moderación</strong><span>Revisar denuncias y decisiones.</span></span><ChevronRight size={18} />
    </Link> : null;
}
