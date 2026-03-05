import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './Login';
import Signup from './Signup';
import Upload from './Upload';
import AdminDashboard from './AdminDashboard';

// Import images
import netajiImage from './images/netaji.webp';
import indiaFlagImage from './images/vecteezy_indian-holiday-background_29559614.jpg';

const API_URL = 'http://localhost:8000';

function App() {
  const [speeches, setSpeeches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSpeech, setSelectedSpeech] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchSpeeches();
    fetchCategories();
    
    // Load user from localStorage
    const userData = localStorage.getItem('user');
const token = localStorage.getItem('token');
if (userData && token) {
  try {
    setUser(JSON.parse(userData));
  } catch (e) {
    // Invalid user data, clear it
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}
  }, []);

  const fetchSpeeches = async () => {
    try {
      const response = await fetch(`${API_URL}/speeches`);
      const data = await response.json();
      const speechesArray = data.speeches || data;
      setSpeeches(Array.isArray(speechesArray) ? speechesArray : []);
    } catch (error) {
      console.error('Error fetching speeches:', error);
      setSpeeches([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      const data = await response.json();
      setCategories(['All', ...data.map(cat => cat.name)]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['All', 'Entertainment', 'Comedy', 'Dance', 'Music', 'Kids', 'Family', 'Personal']);
    }
  };

  const filteredSpeeches = speeches.filter(speech => {
    const matchesCategory = selectedCategory === 'All' || speech.category === selectedCategory;
    const matchesSearch = speech.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         speech.speaker_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        <Route path="/" element={
          <div className="App">
            {/* Header */}
            <header className="App-header">
              <div className="header-left">
                <div className="logo-container">
                  <img 
                    src={netajiImage} 
                    alt="Netaji Subhas Chandra Bose" 
                    className="netaji-logo"
                  />
                  <div className="logo-text">NETHAJI PRIME</div>
                </div>
                <nav className="nav-links">
                  <a href="/" className="nav-link active">Home</a>
                  <a href="/upload" className="nav-link">Upload</a>
                  <a href="/admin" className="nav-link">Admin</a>
                </nav>
              </div>

              <div className="header-right">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>
                
                {user ? (
                  <div className="user-menu">
                    <span className="user-greeting">👤 {user.full_name || user.email}</span>
                    <button onClick={handleLogout} className="logout-btn">
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="auth-buttons">
                    <a href="/login" className="auth-btn">Login</a>
                    <a href="/signup" className="auth-btn signup">Sign Up</a>
                  </div>
                )}
              </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
              {/* Indian Flag Banner */}
              <div 
                className="indian-flag-banner"
                style={{
                  backgroundImage: `url(${indiaFlagImage})`
                }}
              >
                <div className="flag-overlay"></div>
              </div>

              {/* Categories */}
              <div className="categories-row">
                <div className="category-pills">
                  {categories.map(category => (
                    <div
                      key={category}
                      className={`category-pill ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              </div>

              {/* Videos Grid */}
              <div className="videos-section">
                <h2 className="section-title">
                  {selectedCategory === 'All' ? 'All Videos' : selectedCategory}
                </h2>
                
                {filteredSpeeches.length === 0 ? (
                  <div className="no-videos">
                    <h3>No videos found</h3>
                    <p>Try a different category or search term</p>
                  </div>
                ) : (
                  <div className="videos-grid">
                    {filteredSpeeches.map((speech) => (
                      <div
                        key={speech.id}
                        className="video-card"
                        onClick={() => setSelectedSpeech(speech)}
                      >
                        <div className="video-thumb">
                          {speech.thumbnail_url ? (
                            <img src={speech.thumbnail_url} alt={speech.title} />
                          ) : (
                            <video src={speech.video_url} muted></video>
                          )}
                          <div className="video-duration">{formatDuration(speech.duration || 0)}</div>
                        </div>
                        <div className="video-info">
                          <h3 className="video-title">{speech.title}</h3>
                          <div className="video-meta">
                            <span>{speech.category}</span>
                            <span>•</span>
                            <span>{speech.language}</span>
                          </div>
                          <p className="video-desc">{speech.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </main>

            {/* Video Modal */}
            {selectedSpeech && (
              <div className="video-modal" onClick={() => setSelectedSpeech(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="close-btn" onClick={() => setSelectedSpeech(null)}>
                    ×
                  </button>
                  <div className="video-player">
                    <video
                      controls
                      autoPlay
                      width="100%"
                    >
                      <source src={selectedSpeech.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="video-details">
                    <h2>{selectedSpeech.title}</h2>
                    <div className="video-stats">
                      <span>👤 {selectedSpeech.speaker_name}</span>
                      <span>•</span>
                      <span>📁 {selectedSpeech.category}</span>
                      <span>•</span>
                      <span>🌐 {selectedSpeech.language}</span>
                      {selectedSpeech.location && (
                        <>
                          <span>•</span>
                          <span>📍 {selectedSpeech.location}</span>
                        </>
                      )}
                    </div>
                    <p className="full-desc">{selectedSpeech.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <footer className="App-footer">
              <p>🇮🇳 Nethaji Prime - Your Entertainment Platform</p>
              <p>Inspired by Netaji Subhas Chandra Bose • Built with ❤️ for India</p>
            </footer>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
