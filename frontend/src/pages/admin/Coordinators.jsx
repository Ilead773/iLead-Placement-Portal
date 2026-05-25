import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { UserPlus, Mail, User, ShieldCheck } from 'lucide-react';

const Coordinators = () => {
    const [coordinators, setCoordinators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', email: '', login_id: '',
        can_manage_students: false, can_manage_placements: false, can_manage_resumes: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingCoord, setEditingCoord] = useState(null);

    useEffect(() => {
        fetchCoordinators();
    }, []);

    const fetchCoordinators = async () => {
        try {
            const response = await axios.get('/admin-ops/coordinators/');
            setCoordinators(response.data);
        } catch (error) {
            console.error('Failed to fetch coordinators:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            await axios.post('/admin-ops/create-coordinator/', formData);
            setMessage({ type: 'success', text: 'Coordinator created! An email has been sent with their credentials.' });
            setFormData({ 
                name: '', email: '', login_id: '',
                can_manage_students: false, can_manage_placements: false, can_manage_resumes: false
            });
            setShowModal(false);
            fetchCoordinators();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create coordinator.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdatePermissions = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            await axios.put(`/admin-ops/coordinators/${editingCoord.id}/update-permissions/`, {
                can_manage_students: editingCoord.can_manage_students,
                can_manage_placements: editingCoord.can_manage_placements,
                can_manage_resumes: editingCoord.can_manage_resumes
            });
            setMessage({ type: 'success', text: `Permissions updated successfully for ${editingCoord.name}.` });
            setEditingCoord(null);
            fetchCoordinators();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update permissions.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Placement Coordinators</h1>
                    <p className="subtitle">Manage staff members who coordinate placements</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <UserPlus size={18} style={{ marginRight: '8px' }} />
                    Add Coordinator
                </button>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Login ID</th>
                            <th>Email</th>
                            <th>Joined Date</th>
                            <th>Permissions</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center">Loading...</td></tr>
                        ) : coordinators.length === 0 ? (
                            <tr><td colSpan="7" className="text-center">No coordinators found.</td></tr>
                        ) : (
                            coordinators.map(coord => (
                                <tr key={coord.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="avatar" style={{ backgroundColor: '#8b5cf6', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                                                {coord.name.charAt(0)}
                                            </div>
                                            {coord.name}
                                        </div>
                                    </td>
                                    <td><code>{coord.login_id}</code></td>
                                    <td>{coord.email}</td>
                                    <td>{new Date(coord.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {coord.can_manage_students && <span className="badge badge-info" style={{fontSize: '0.65rem'}}>Students</span>}
                                            {coord.can_manage_placements && <span className="badge badge-info" style={{fontSize: '0.65rem'}}>Placements</span>}
                                            {coord.can_manage_resumes && <span className="badge badge-info" style={{fontSize: '0.65rem'}}>Resumes</span>}
                                            {!coord.can_manage_students && !coord.can_manage_placements && !coord.can_manage_resumes && <span className="text-muted" style={{fontSize: '0.7rem'}}>None</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-success">Active</span>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn btn-secondary btn-sm" 
                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                            onClick={() => setEditingCoord(coord)}
                                        >
                                            Edit Permissions
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <div className="modal-header">
                            <h2>Add New Coordinator</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <div className="input-with-icon">
                                    <User size={18} />
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Email Address</label>
                                <div className="input-with-icon">
                                    <Mail size={18} />
                                    <input 
                                        type="email" 
                                        className="input-field" 
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Login ID (Username)</label>
                                <div className="input-with-icon">
                                    <ShieldCheck size={18} />
                                    <input 
                                        type="text" 
                                        className="input-field" 
                                        value={formData.login_id}
                                        onChange={e => setFormData({...formData, login_id: e.target.value})}
                                        placeholder="e.g. coord_it"
                                        required 
                                    />
                                </div>
                                <p className="helper-text">A random password will be generated and sent via email.</p>
                            </div>
                            
                            <div className="input-group" style={{ marginTop: '20px' }}>
                                <label style={{ marginBottom: '10px', display: 'block' }}>Permissions (Check all that apply)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--card-hover)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.can_manage_students}
                                            onChange={e => setFormData({...formData, can_manage_students: e.target.checked})}
                                        />
                                        Manage Students & Profiles
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.can_manage_placements}
                                            onChange={e => setFormData({...formData, can_manage_placements: e.target.checked})}
                                        />
                                        Manage Jobs, Placements & Drives
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.can_manage_resumes}
                                            onChange={e => setFormData({...formData, can_manage_resumes: e.target.checked})}
                                        />
                                        Generate & Send Resumes
                                    </label>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingCoord && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <div className="modal-header">
                            <h2>Edit Permissions: {editingCoord.name}</h2>
                            <button className="btn-close" onClick={() => setEditingCoord(null)}>×</button>
                        </div>
                        <form onSubmit={handleUpdatePermissions}>
                            <div className="input-group" style={{ marginTop: '20px' }}>
                                <label style={{ marginBottom: '10px', display: 'block' }}>Permissions (Check all that apply)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--card-hover)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editingCoord.can_manage_students}
                                            onChange={e => setEditingCoord({...editingCoord, can_manage_students: e.target.checked})}
                                        />
                                        Manage Students & Profiles
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editingCoord.can_manage_placements}
                                            onChange={e => setEditingCoord({...editingCoord, can_manage_placements: e.target.checked})}
                                        />
                                        Manage Jobs, Placements & Drives
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={editingCoord.can_manage_resumes}
                                            onChange={e => setEditingCoord({...editingCoord, can_manage_resumes: e.target.checked})}
                                        />
                                        Generate & Send Resumes
                                    </label>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingCoord(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Permissions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Coordinators;
