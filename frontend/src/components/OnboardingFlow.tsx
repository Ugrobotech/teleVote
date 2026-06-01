import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, MapPin, Star, CheckCircle, Vote } from 'lucide-react';

const API_BASE = '/api';

interface Candidate {
  _id: string;
  name: string;
  role: 'PRESIDENT' | 'GOVERNOR';
  state?: string;
  imageUrl?: string;
  totalTaps: number;
}

interface OnboardingFlowProps {
  telegramId: string;
  username: string;
  firstName: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'state' | 'presidential' | 'gubernatorial';

const STEPS: Step[] = ['welcome', 'state', 'presidential', 'gubernatorial'];

export default function OnboardingFlow({
  telegramId,
  firstName,
  onComplete,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animating, setAnimating] = useState(false);

  // State selection
  const [states, setStates] = useState<string[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Candidate selections
  const [presidentialCandidates, setPresidentialCandidates] = useState<Candidate[]>([]);
  const [gubernatorialCandidates, setGubernatorialCandidates] = useState<Candidate[]>([]);
  const [selectedPresidential, setSelectedPresidential] = useState<string>('');
  const [selectedGubernatorial, setSelectedGubernatorial] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const stepIndex = STEPS.indexOf(currentStep);

  // Fetch states on mount
  useEffect(() => {
    fetch(`${API_BASE}/user/states`)
      .then((r) => r.json())
      .then((data) => setStates(data.states || []))
      .catch(console.error);
  }, []);

  // Fetch presidential candidates when reaching that step
  useEffect(() => {
    if (currentStep === 'presidential' && presidentialCandidates.length === 0) {
      fetch(`${API_BASE}/game/candidates?role=PRESIDENT`)
        .then((r) => r.json())
        .then((data) => setPresidentialCandidates(data))
        .catch(console.error);
    }
  }, [currentStep]);

  // Fetch gubernatorial candidates when state is confirmed and reaching that step
  useEffect(() => {
    if (currentStep === 'gubernatorial' && selectedState) {
      fetch(`${API_BASE}/game/candidates?role=GOVERNOR&state=${encodeURIComponent(selectedState)}`)
        .then((r) => r.json())
        .then((data) => setGubernatorialCandidates(data))
        .catch(console.error);
    }
  }, [currentStep, selectedState]);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return states;
    return states.filter((s) =>
      s.toLowerCase().includes(stateSearch.toLowerCase()),
    );
  }, [states, stateSearch]);

  const goTo = (step: Step, dir: 'forward' | 'backward') => {
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setAnimating(false);
    }, 250);
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'state':
        return !!selectedState;
      case 'presidential':
        return !!selectedPresidential;
      case 'gubernatorial':
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canGoNext()) return;

    if (currentStep === 'gubernatorial') {
      // Final step — submit onboarding
      setIsSubmitting(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/user/onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId,
            state: selectedState,
            presidentialCandidateId: selectedPresidential,
            gubernatorialCandidateId: selectedGubernatorial,
          }),
        });
        const result = await res.json();
        if (result.success) {
          onComplete();
        } else {
          setError(result.message || 'Something went wrong');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      goTo(STEPS[nextIdx], 'forward');
    }
  };

  const handleBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      goTo(STEPS[prevIdx], 'backward');
    }
  };

  // Generate avatar URL for candidate
  const getCandidateAvatar = (candidate: Candidate) => {
    if (candidate.imageUrl) return candidate.imageUrl;
    const initials = candidate.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=008753&color=fff&size=128&bold=true`;
  };

  return (
    <div className="onboarding-container">
      {/* Progress bar */}
      {currentStep !== 'welcome' && (
        <div className="onboarding-progress">
          {STEPS.slice(1).map((step) => (
            <div
              key={step}
              className={`progress-dot ${
                STEPS.indexOf(step) <= stepIndex ? 'active' : ''
              } ${STEPS.indexOf(step) < stepIndex ? 'completed' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Content area with slide animation */}
      <div
        className={`onboarding-content ${animating ? `slide-out-${direction}` : 'slide-in'}`}
      >
        {/* ---- WELCOME ---- */}
        {currentStep === 'welcome' && (
          <div className="onboarding-step welcome-step">
            <div className="welcome-badge">🇳🇬</div>
            <h1 className="welcome-title">
              Tap for Your
              <br />
              <span className="green-text">Candidate</span>
            </h1>
            <p className="welcome-subtitle">
              {firstName ? `Hey ${firstName}! ` : ''}Support your favorite
              candidates for the 2027 Nigerian elections through fun,
              gamified tapping!
            </p>

            <div className="welcome-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <Vote size={20} />
                </div>
                <div>
                  <strong>Choose & Tap</strong>
                  <p>Pick your candidates and tap to show support</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Star size={20} />
                </div>
                <div>
                  <strong>Earn Points</strong>
                  <p>Climb the leaderboard with every tap</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <MapPin size={20} />
                </div>
                <div>
                  <strong>Represent Your State</strong>
                  <p>Support both presidential & gubernatorial candidates</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- STATE SELECTION ---- */}
        {currentStep === 'state' && (
          <div className="onboarding-step state-step">
            <h2 className="step-title">
              <MapPin size={24} className="step-icon" />
              Select Your State
            </h2>
            <p className="step-description">
              Choose your state of residence to see your gubernatorial candidates
            </p>

            <div className="search-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search states..."
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
              />
            </div>

            <div className="state-list">
              {filteredStates.map((state) => (
                <div
                  key={state}
                  className={`state-item ${selectedState === state ? 'selected' : ''}`}
                  onClick={() => setSelectedState(state)}
                >
                  <span>{state}</span>
                  {selectedState === state && (
                    <CheckCircle size={20} className="check-icon" />
                  )}
                </div>
              ))}
              {filteredStates.length === 0 && (
                <div className="state-item empty">No states match your search</div>
              )}
            </div>
          </div>
        )}

        {/* ---- PRESIDENTIAL CANDIDATE ---- */}
        {currentStep === 'presidential' && (
          <div className="onboarding-step candidate-step">
            <h2 className="step-title">
              <Star size={24} className="step-icon" />
              Presidential Candidate
            </h2>
            <p className="step-description">
              Choose the presidential candidate you want to support
            </p>

            <div className="candidate-grid">
              {presidentialCandidates.map((c) => (
                <div
                  key={c._id}
                  className={`candidate-card ${selectedPresidential === c._id ? 'selected' : ''}`}
                  onClick={() => setSelectedPresidential(c._id)}
                >
                  <div className="candidate-avatar">
                    <img src={getCandidateAvatar(c)} alt={c.name} />
                    {selectedPresidential === c._id && (
                      <div className="candidate-check">
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </div>
                  <span className="candidate-name">{c.name}</span>
                  <span className="candidate-taps">
                    {c.totalTaps.toLocaleString()} taps
                  </span>
                </div>
              ))}
              {presidentialCandidates.length === 0 && (
                <div className="loading-placeholder">Loading candidates...</div>
              )}
            </div>
          </div>
        )}

        {/* ---- GUBERNATORIAL CANDIDATE ---- */}
        {currentStep === 'gubernatorial' && (
          <div className="onboarding-step candidate-step">
            <h2 className="step-title">
              <Star size={24} className="step-icon" />
              Governor — {selectedState}
            </h2>
            <p className="step-description">
              Choose your gubernatorial candidate for {selectedState}
            </p>

            <div className="candidate-grid">
              {gubernatorialCandidates.map((c) => (
                <div
                  key={c._id}
                  className={`candidate-card ${selectedGubernatorial === c._id ? 'selected' : ''}`}
                  onClick={() => setSelectedGubernatorial(c._id)}
                >
                  <div className="candidate-avatar">
                    <img src={getCandidateAvatar(c)} alt={c.name} />
                    {selectedGubernatorial === c._id && (
                      <div className="candidate-check">
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </div>
                  <span className="candidate-name">{c.name}</span>
                  <span className="candidate-taps">
                    {c.totalTaps.toLocaleString()} taps
                  </span>
                </div>
              ))}
              {gubernatorialCandidates.length === 0 && (
                <div className="loading-placeholder">
                  {selectedState
                    ? 'No candidates available for this state yet'
                    : 'Loading candidates...'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && <div className="onboarding-error">{error}</div>}

      {/* Navigation buttons */}
      <div className="onboarding-nav">
        {stepIndex > 0 && (
          <button className="nav-btn back-btn" onClick={handleBack}>
            <ChevronLeft size={20} />
            Back
          </button>
        )}
        <button
          className={`nav-btn next-btn ${!canGoNext() ? 'disabled' : ''} ${isSubmitting ? 'submitting' : ''}`}
          onClick={handleNext}
          disabled={!canGoNext() || isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : currentStep === 'gubernatorial'
              ? (selectedGubernatorial ? 'Start Tapping! 🚀' : 'Skip & Start! 🚀')
              : currentStep === 'welcome'
                ? 'Get Started'
                : 'Continue'}
          {!isSubmitting && currentStep !== 'gubernatorial' && (
            <ChevronRight size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
