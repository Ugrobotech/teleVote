import { useState, useEffect, useRef } from 'react';
import { Download, Check } from 'lucide-react';

interface Candidate {
  _id: string;
  name: string;
  role: 'PRESIDENT' | 'GOVERNOR';
  state?: string;
}

interface PosterGeneratorProps {
  profile: any;
}

const THEMES = [
  {
    id: 'patriotic',
    name: 'Patriotic Green',
    primary: '#008753',
    secondary: '#FFFFFF',
    text: '#008753',
    darkText: '#1b1b1b',
    accent: '#FFD700',
    bg: '#f4faf6',
  },
  {
    id: 'royal',
    name: 'Royal Gold',
    primary: '#1d2a44',
    secondary: '#FFD700',
    text: '#ffffff',
    darkText: '#1d2a44',
    accent: '#FFD700',
    bg: '#121a2c',
  },
  {
    id: 'sunset',
    name: 'Vibrant Sunset',
    primary: '#e65c00',
    secondary: '#F9D423',
    text: '#ffffff',
    darkText: '#e65c00',
    accent: '#111111',
    bg: '#fff9f0',
  },
  {
    id: 'cyber',
    name: 'Futuristic Dark',
    primary: '#0f172a',
    secondary: '#38bdf8',
    text: '#38bdf8',
    darkText: '#f8fafc',
    accent: '#f43f5e',
    bg: '#020617',
  },
];

const SLOGANS = [
  'For a United & Prosperous Nigeria! 🇳🇬',
  'The Change We Need. The Leader We Trust. ✊',
  'Progress, Peace, and Shared Prosperity! 🚀',
  'Building a Future of Hope & Development. 🌟',
];

export default function PosterGenerator({ profile }: PosterGeneratorProps) {
  const user = profile?.user || {};
  const presidential = user.presidentialCandidate as Candidate;
  const gubernatorial = user.gubernatorialCandidate as Candidate;

  // Selected state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(presidential || gubernatorial || null);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [customSlogan, setCustomSlogan] = useState(SLOGANS[0]);
  const [isCustomSlogan, setIsCustomSlogan] = useState(false);
  const [endorserName, setEndorserName] = useState(
    user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : `@${user.username || 'Citizen'}`
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw poster on settings changes
  useEffect(() => {
    drawPoster();
  }, [selectedCandidate, activeTheme, customSlogan, endorserName]);

  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedCandidate) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = activeTheme;
    const width = 800;
    const height = 1000;

    // 1. Clear & Paint Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // Decorative Borders / Patterns
    if (theme.id === 'patriotic') {
      // Left and Right green pillars (representing Nigerian flag)
      ctx.fillStyle = theme.primary;
      ctx.fillRect(0, 0, 60, height);
      ctx.fillRect(width - 60, 0, 60, height);
    } else if (theme.id === 'royal') {
      // Premium Gold Accent Borders
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 15;
      ctx.strokeRect(20, 20, width - 40, height - 40);
    } else if (theme.id === 'sunset') {
      // Sunset Gradient Top
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, theme.primary);
      grad.addColorStop(1, theme.secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 250);
    } else if (theme.id === 'cyber') {
      // Grid mesh accent
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }
      // Glowing border
      ctx.strokeStyle = theme.secondary;
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, width - 20, height - 20);
    }

    // 2. Large Candidate Initials Badge in Center-Top
    const badgeX = width / 2;
    const badgeY = 220;
    const badgeRadius = 100;

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Draw Badge Circle
    ctx.fillStyle = theme.id === 'cyber' ? '#1e293b' : theme.secondary;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Inner Ring
    ctx.shadowColor = 'transparent'; // Reset shadow
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius - 10, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Initials
    const initials = selectedCandidate.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    ctx.fillStyle = theme.id === 'cyber' ? theme.secondary : theme.text;
    ctx.font = 'bold 70px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, badgeX, badgeY);
    ctx.restore();

    // 3. Campaign Header Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // "SUPPORT" / "VOTE FOR" label
    ctx.fillStyle = theme.id === 'patriotic' ? theme.darkText : theme.secondary;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(selectedCandidate.role === 'PRESIDENT' ? 'VOTE FOR PRESIDENT' : `SUPPORT GOVERNOR OF ${selectedCandidate.state?.toUpperCase()}`, width / 2, 400);

    // Candidate Name
    ctx.fillStyle = theme.id === 'patriotic' || theme.id === 'sunset' ? theme.primary : '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(selectedCandidate.name, width / 2, 480);

    // Thin accent divider
    ctx.fillStyle = theme.secondary === '#FFFFFF' ? theme.accent : theme.secondary;
    ctx.fillRect(width / 2 - 150, 520, 300, 6);

    // 4. Slogan Box
    const sloganBoxY = 570;
    const sloganBoxH = 140;
    
    ctx.fillStyle = theme.id === 'royal' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    if (theme.id === 'cyber') ctx.fillStyle = 'rgba(56, 189, 248, 0.02)';
    ctx.beginPath();
    ctx.roundRect(120, sloganBoxY, 560, sloganBoxH, 15);
    ctx.fill();

    // Text in Slogan Box
    ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? '#f8fafc' : theme.darkText;
    ctx.font = 'italic 26px sans-serif';
    
    // Wrap slogan if it is long
    const sloganText = customSlogan;
    if (sloganText.length > 35) {
      const words = sloganText.split(' ');
      let line1 = '';
      let line2 = '';
      let breakIdx = Math.floor(words.length / 2);
      for (let i = 0; i < words.length; i++) {
        if (i <= breakIdx) line1 += words[i] + ' ';
        else line2 += words[i] + ' ';
      }
      ctx.fillText(line1.trim(), width / 2, sloganBoxY + 55);
      ctx.fillText(line2.trim(), width / 2, sloganBoxY + 100);
    } else {
      ctx.fillText(sloganText, width / 2, sloganBoxY + 80);
    }

    // 5. Endorsement Signature
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px sans-serif';
    ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0,0,0,0.6)';
    ctx.fillText('CAMPAIGN ENVOY:', width / 2, 790);

    ctx.fillStyle = theme.accent === '#111111' ? theme.primary : theme.accent;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(endorserName, width / 2, 835);

    // 6. Bottom footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 890);
    ctx.lineTo(width - 100, 890);
    ctx.stroke();

    ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0,0,0,0.4)';
    ctx.font = '15px sans-serif';
    ctx.fillText('Generated via 2027 Election Game Telegram Mini App', width / 2, 930);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${selectedCandidate?.name.replace(/\s+/g, '_')}_2027_Poster.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <main className="main-content poster-main">
      <div className="poster-editor-grid">
        {/* Visual Settings Editor Panel */}
        <div className="editor-controls-card">
          <h2 className="editor-title">Poster Customizer</h2>
          <p className="editor-desc">Show support for your candidate with a custom high-quality campaign poster.</p>

          {/* 1. Candidate Selector */}
          <div className="control-group">
            <label className="control-label">Candidate</label>
            <div className="editor-candidate-selector">
              {presidential && (
                <button
                  className={`cand-sel-btn ${selectedCandidate?._id === presidential._id ? 'active' : ''}`}
                  onClick={() => setSelectedCandidate(presidential)}
                >
                  {presidential.name} (Pres)
                </button>
              )}
              {gubernatorial && (
                <button
                  className={`cand-sel-btn ${selectedCandidate?._id === gubernatorial._id ? 'active' : ''}`}
                  onClick={() => setSelectedCandidate(gubernatorial)}
                >
                  {gubernatorial.name} (Gov)
                </button>
              )}
            </div>
          </div>

          {/* 2. Theme Selector */}
          <div className="control-group">
            <label className="control-label">Visual Theme</label>
            <div className="theme-color-palette-grid">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`theme-selection-item ${activeTheme.id === theme.id ? 'active' : ''}`}
                  onClick={() => setActiveTheme(theme)}
                  style={{ backgroundColor: theme.primary }}
                >
                  <span className="theme-tooltip-name">{theme.name}</span>
                  {activeTheme.id === theme.id && <Check size={16} className="checkmark-theme" />}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Slogans list */}
          <div className="control-group">
            <label className="control-label">Campaign Slogan</label>
            <div className="slogan-selection-column">
              {SLOGANS.map((slogan, idx) => (
                <div
                  key={idx}
                  className={`slogan-item-selector ${!isCustomSlogan && customSlogan === slogan ? 'active' : ''}`}
                  onClick={() => {
                    setIsCustomSlogan(false);
                    setCustomSlogan(slogan);
                  }}
                >
                  {slogan}
                </div>
              ))}
              <div
                className={`slogan-item-selector custom-input-trigger ${isCustomSlogan ? 'active' : ''}`}
                onClick={() => setIsCustomSlogan(true)}
              >
                <span>Custom Slogan...</span>
              </div>
              
              {isCustomSlogan && (
                <input
                  type="text"
                  className="custom-slogan-input-field"
                  placeholder="Enter slogan..."
                  maxLength={70}
                  value={customSlogan}
                  onChange={(e) => setCustomSlogan(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* 4. Endorser signature text */}
          <div className="control-group">
            <label className="control-label">Endorser Signature</label>
            <input
              type="text"
              maxLength={25}
              className="endorser-signature-field"
              value={endorserName}
              onChange={(e) => setEndorserName(e.target.value)}
            />
          </div>

          {/* Action button */}
          <button onClick={handleDownload} className="download-poster-action-btn">
            <Download size={18} />
            Download PNG Poster
          </button>
        </div>

        {/* Live Preview Panel (Canvas) */}
        <div className="editor-preview-card">
          <div className="canvas-wrapper-element">
            <canvas ref={canvasRef} width={800} height={1000} className="poster-preview-canvas" />
          </div>
        </div>
      </div>
    </main>
  );
}
