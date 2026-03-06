import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Upload.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Upload() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    speaker_name: '',
    description: '',
    category: '',
    language: 'Tamil'
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // Protect route - require login
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('⚠️ Please login to upload videos');
      navigate('/login');
    }
  }, [navigate]);

  const categories = [
    'Entertainment', 'Comedy', 'Dance', 'Music', 
    'Kids', 'Family', 'Personal', 'Vlogs',
    'Educational', 'Sports', 'Travel', 'Food',
    'Technology', 'Arts & Crafts', 'Pets', 'Gaming'
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoFile) {
      setMessage('Please select a video file');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const submitData = {
        ...formData,
        video_url: 'PENDING_UPLOAD',
        thumbnail_url: thumbnailFile ? 'PENDING_THUMBNAIL' : null
      };

      const response = await fetch(`${API_URL}/speeches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        setMessage('✅ Video submitted successfully! Please upload to R2 and get admin approval.');
        setFormData({
          title: '',
          speaker_name: '',
          description: '',
          category: '',
          language: 'Tamil'
        });
        setVideoFile(null);
        setThumbnailFile(null);
        
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        const error = await response.json();
        setMessage(`❌ Error: ${error.detail || 'Upload failed'}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-header">
        <button onClick={() => navigate('/')} className="back-button">
          ← Back to Home
        </button>
        <h1>🎬 Upload Video</h1>
        <p className="upload-subtitle">Share your special moments with everyone</p>
      </div>

      <div className="upload-container">
        <form onSubmit={handleSubmit} className="upload-form">
          {/* Video File */}
          <div className="form-group">
            <label>Video File *</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
                required
              />
              {videoFile && <span className="file-name">📹 {videoFile.name}</span>}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="form-group">
            <label>Thumbnail Image (Optional)</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files[0])}
              />
              {thumbnailFile && <span className="file-name">🖼️ {thumbnailFile.name}</span>}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Family Dance Performance"
              required
            />
          </div>

          {/* Speaker/Creator Name */}
          <div className="form-group">
            <label>Creator Name *</label>
            <input
              type="text"
              name="speaker_name"
              value={formData.speaker_name}
              onChange={handleInputChange}
              placeholder="e.g., Your Name"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your video content..."
              rows="4"
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="form-group">
            <label>Language *</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              required
            >
              <option value="Tamil">Tamil</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Telugu">Telugu</option>
              <option value="Malayalam">Malayalam</option>
              <option value="Kannada">Kannada</option>
            </select>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="submit-button"
            disabled={uploading}
          >
            {uploading ? '⏳ Submitting...' : '✨ Submit Video'}
          </button>

          {/* Message */}
          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </form>

        {/* Instructions */}
        <div className="upload-instructions">
          <h3>📋 Upload Instructions</h3>
          <ol>
            <li>Fill in all required fields (*)</li>
            <li>Submit the form to create a database entry</li>
            <li>Convert video to H.264 format using VLC (if needed)</li>
            <li>Upload video file to Cloudflare R2</li>
            <li>Get R2 URL from Cloudflare dashboard</li>
            <li>Admin will approve and add the R2 URL</li>
            <li>Your video will go live! 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Upload;
