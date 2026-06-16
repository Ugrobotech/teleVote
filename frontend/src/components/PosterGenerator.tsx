import { useState, useEffect, useRef } from 'react';
import { Download, Check } from 'lucide-react';

interface Candidate {
  _id: string;
  name: string;
  role: 'PRESIDENT' | 'GOVERNOR';
  state?: string;
  imageUrl?: string;
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

  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [customSlogan, setCustomSlogan] = useState(SLOGANS[0]);
  const [isCustomSlogan, setIsCustomSlogan] = useState(false);
  const [endorserName, setEndorserName] = useState(
    user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : `@${user.username || 'Citizen'}`
  );

  const [presidentialImage, setPresidentialImage] = useState<HTMLImageElement | null>(null);
  const [gubernatorialImage, setGubernatorialImage] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload Presidential Candidate Image
  useEffect(() => {
    if (!presidential || !presidential.imageUrl) {
      setPresidentialImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = presidential.imageUrl;
    img.onload = () => {
      setPresidentialImage(img);
    };
    img.onerror = () => {
      setPresidentialImage(null);
    };
  }, [presidential]);

  // Preload Gubernatorial Candidate Image
  useEffect(() => {
    if (!gubernatorial || !gubernatorial.imageUrl) {
      setGubernatorialImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = gubernatorial.imageUrl;
    img.onload = () => {
      setGubernatorialImage(img);
    };
    img.onerror = () => {
      setGubernatorialImage(null);
    };
  }, [gubernatorial]);

  // Redraw poster on settings changes
  useEffect(() => {
    drawPoster();
  }, [activeTheme, customSlogan, endorserName, presidentialImage, gubernatorialImage]);

  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // 2. Title Section (Tele-Vote Header)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Top App Name Header
    ctx.fillStyle = theme.id === 'cyber' ? theme.secondary : (theme.id === 'patriotic' ? theme.primary : theme.accent);
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('TELE-VOTE 2027', width / 2, 100);

    ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('MY PREFERRED REPRESENTATIVES FOR NIGERIA', width / 2, 140);

    // Helper to draw candidate badge
    const drawCandidateBadge = (
      cand: Candidate | null,
      img: HTMLImageElement | null,
      cx: number,
      cy: number,
      radius: number,
      roleLabel: string,
      candName: string
    ) => {
      ctx.save();
      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      // Draw Badge Circle
      ctx.fillStyle = theme.id === 'cyber' ? '#1e293b' : theme.secondary;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw Inner Ring
      ctx.shadowColor = 'transparent'; // Reset shadow
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
      ctx.stroke();

      if (cand) {
        if (img) {
          // Draw image inside the circle!
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
          ctx.clip();
          
          // Draw image to fill the circle
          ctx.drawImage(
            img,
            cx - (radius - 8),
            cy - (radius - 8),
            (radius - 8) * 2,
            (radius - 8) * 2
          );
          ctx.restore();
        } else {
          // Draw Initials
          const initials = cand.name
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          ctx.fillStyle = theme.id === 'cyber' ? theme.secondary : theme.text;
          ctx.font = 'bold 50px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initials, cx, cy);
        }
      } else {
        // Placeholder / Not Selected
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.id === 'cyber' ? theme.secondary : theme.text;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
      }
      ctx.restore();

      // Candidate Text Info under badge
      ctx.textAlign = 'center';
      ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? theme.secondary : theme.darkText;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(roleLabel, cx, cy + radius + 35);

      ctx.fillStyle = theme.id === 'patriotic' || theme.id === 'sunset' ? theme.primary : '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      
      // Wrap name if too long for side-by-side
      const maxNameWidth = 260;
      const metrics = ctx.measureText(candName);
      if (metrics.width > maxNameWidth) {
        const words = candName.split(' ');
        let line1 = '';
        let line2 = '';
        let breakIdx = Math.floor(words.length / 2);
        for (let i = 0; i < words.length; i++) {
          if (i <= breakIdx) line1 += words[i] + ' ';
          else line2 += words[i] + ' ';
        }
        ctx.fillText(line1.trim(), cx, cy + radius + 70);
        ctx.fillText(line2.trim(), cx, cy + radius + 100);
      } else {
        ctx.fillText(candName, cx, cy + radius + 75);
      }
    };

    // Draw Presidential Candidate (Left)
    drawCandidateBadge(
      presidential || null,
      presidentialImage,
      220,
      280,
      90,
      'VOTE FOR PRESIDENT',
      presidential ? presidential.name : 'Not Selected'
    );

    // Draw Gubernatorial Candidate (Right)
    drawCandidateBadge(
      gubernatorial || null,
      gubernatorialImage,
      580,
      280,
      90,
      `GOVERNOR OF ${user.state?.toUpperCase() || 'STATE'}`,
      gubernatorial ? gubernatorial.name : 'Not Selected'
    );

    // Thin accent divider
    ctx.fillStyle = theme.secondary === '#FFFFFF' ? theme.accent : theme.secondary;
    ctx.fillRect(width / 2 - 150, 520, 300, 6);

    // 4. Slogan Box
    const sloganBoxY = 570;
    const sloganBoxH = 140;
    
    ctx.fillStyle = theme.id === 'royal' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    if (theme.id === 'cyber') ctx.fillStyle = 'rgba(56, 189, 248, 0.02)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(120, sloganBoxY, 560, sloganBoxH, 15);
    } else {
      ctx.rect(120, sloganBoxY, 560, sloganBoxH);
    }
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
    ctx.fillStyle = theme.id === 'royal' || theme.id === 'cyber' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0,0,0,0.6)';
    ctx.font = '16px sans-serif';
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
    ctx.fillText('Generated via Tele-Vote Telegram Mini App 🇳🇬', width / 2, 930);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Tele_Vote_2027_Poster.png`;
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
