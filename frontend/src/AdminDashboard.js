import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_URL = 'http://localhost:8000';

function AdminDashboard() {
  const navigate = useNavigate();
  const [pendingVideos, setPendingVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkAuth();
    fetchPendingVideos();
  }, []);

 const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // If no token, redirect to login
  if (!token) {
    navigate('/login');
    return;
  }
  
  // For now, allow any logged-in user to access admin
  // TODO: Add proper superadmin check later
  setUserName(user.full_name || user.email || 'Admin User');
};

  const fetchPendingVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/speeches`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const speeches = data.speeches || data;
        const pending = speeches.filter(s => s.approval_status === 'pending');
        setPendingVideos(pending);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId) => {
    const r2Url = prompt('Enter the Cloudflare R2 URL for this video:');
    
    if (!r2Url) {
      alert('R2 URL is required to approve the video');
      return;
    }

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
        alert('❌ Error approving video');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
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
        alert('❌ Error rejecting video');
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <h1>🛡️ Admin Dashboard</h1>
          <p className="welcome-text">Welcome, {userName}!</p>
        </div>
        <button onClick={() => navigate('/')} className="home-button">
          ← Back to Home
        </button>
      </div>

      {/* Stats Card */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Approval</h3>
            <p className="stat-number">{pendingVideos.length}</p>
          </div>
        </div>
      </div>

      {/* Pending Videos Section */}
      <div className="pending-section">
        <h2 className="section-title">Pending Videos ({pendingVideos.length})</h2>
        
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading videos...</p>
          </div>
        ) : pendingVideos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>No pending videos! All caught up!</h3>
            <p>Check back later for new submissions</p>
          </div>
        ) : (
          <div className="videos-grid">
            {pendingVideos.map((video) => (
              <div key={video.id} className="video-card">
                <div className="video-header">
                  <h3 className="video-title">{video.title}</h3>
                  <span className="pending-badge">⏳ Pending</span>
                </div>
                
                <div className="video-details">
                  <div className="detail-row">
                    <span className="detail-label">👤 Creator:</span>
                    <span className="detail-value">{video.speaker_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📁 Category:</span>
                    <span className="detail-value">{video.category}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🌐 Language:</span>
                    <span className="detail-value">{video.language}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📝 Description:</span>
                    <span className="detail-value description">{video.description}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📅 Submitted:</span>
                    <span className="detail-value">
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="video-actions">
                  <button 
                    onClick={() => handleApprove(video.id)}
                    className="approve-button"
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleReject(video.id)}
                    className="reject-button"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;