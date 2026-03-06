import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = 'http://localhost:8000';

function AdminDashboard() {
  const navigate = useNavigate();
  const [pendingVideos, setPendingVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.is_superadmin) {
      alert('⚠️ Access denied. Admin privileges required.');
      navigate('/login');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (checkAuth()) {
      fetchPendingVideos();
    }
  }, []);

  const fetchPendingVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/speeches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      const pending = data.speeches.filter(v => v.approval_status === 'pending');
      setPendingVideos(pending);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (videoId) => {
    const r2Url = prompt('Enter the Cloudflare R2 URL for this video:');
    if (!r2Url) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/speeches/${videoId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ video_url: r2Url })
      });

      if (response.ok) {
        alert('✅ Video approved successfully!');
        fetchPendingVideos();
      } else {
        alert('❌ Failed to approve video');
      }
    } catch (error) {
      console.error('Error approving video:', error);
      alert('❌ Error approving video');
    }
  };

  const handleReject = async (videoId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/speeches/${videoId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('✅ Video rejected');
        fetchPendingVideos();
      } else {
        alert('❌ Failed to reject video');
      }
    } catch (error) {
      console.error('Error rejecting video:', error);
      alert('❌ Error rejecting video');
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Home
        </button>
        <h1>🛡️ Admin Dashboard</h1>
        <p className="welcome-text">Welcome, {user.full_name}!</p>
      </div>

      <div className="stats-card">
        <h2>📊 Pending Approvals</h2>
        <div className="stat-number">{pendingVideos.length}</div>
      </div>

      {pendingVideos.length === 0 ? (
        <div className="empty-state">
          <h3>🎉 No pending videos!</h3>
          <p>All caught up! Check back later.</p>
        </div>
      ) : (
        <div className="videos-grid">
          {pendingVideos.map((video) => (
            <div key={video.id} className="admin-video-card">
              <div className="video-info">
                <h3>{video.title}</h3>
                <p><strong>Speaker:</strong> {video.speaker_name}</p>
                <p><strong>Category:</strong> {video.category}</p>
                <p><strong>Language:</strong> {video.language}</p>
                <p className="description">{video.description}</p>
                <p className="upload-date">
                  Uploaded: {new Date(video.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="admin-actions">
                <button
                  onClick={() => handleApprove(video.id)}
                  className="approve-btn"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleReject(video.id)}
                  className="reject-btn"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;