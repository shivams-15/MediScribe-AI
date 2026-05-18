import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../services/api";
import { useAppStore } from "../store/appStore";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Medical-Grade Accuracy",
    description:
      "Advanced speech recognition trained on medical terminology ensures accurate capture of diagnoses, medications, and clinical observations.",
    gradient: "from-deep-green to-action-blue",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "Contextual Intelligence",
    description:
      "AI analyzes conversation flow in real-time, extracting chief complaints, symptoms, duration, and relevant medical history automatically.",
    gradient: "from-action-blue to-coral",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Real-Time Assistance",
    description:
      "Get intelligent question suggestions during consultations to ensure comprehensive patient assessment and capture critical information.",
    gradient: "from-coral to-deep-green",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Automated Documentation",
    description:
      "Transform conversations into structured clinical notes with automatically organized SOAP format, ICD codes, and billing information.",
    gradient: "from-action-blue to-deep-green",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "HIPAA Compliant",
    description:
      "Enterprise-grade security with end-to-end encryption, secure data handling, and full compliance with healthcare privacy regulations.",
    gradient: "from-deep-green to-success",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    title: "Multi-Language Support",
    description:
      "Communicate naturally with patients across languages while maintaining accurate medical documentation in your preferred language.",
    gradient: "from-coral to-action-blue",
  },
];

const useCases = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Primary Care Physicians",
    description:
      "Streamline routine consultations, chronic disease management, and preventive care with automated note-taking and follow-up reminders.",
    impact: "Save 2+ hours daily on documentation",
    gradient: "from-deep-green to-action-blue",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: "Specialists & Consultants",
    description:
      "Capture complex diagnostic findings, treatment plans, and specialist assessments with precision for cardiology, neurology, and more.",
    impact: "More time for patient care, less charting",
    gradient: "from-action-blue to-coral",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Emergency Medicine",
    description:
      "Fast, accurate documentation during high-pressure situations with rapid triage assessment and critical decision support.",
    impact: "Critical information captured instantly",
    gradient: "from-coral to-error",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "Telehealth Providers",
    description:
      "Seamlessly document virtual consultations with real-time transcription, making remote care as efficient as in-person visits.",
    impact: "Scale telemedicine without admin overhead",
    gradient: "from-action-blue to-deep-green",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Group Practices & Clinics",
    description:
      "Standardize documentation across teams, ensure compliance, and improve care coordination with consistent AI-powered assistance.",
    impact: "Unified documentation standards",
    gradient: "from-deep-green to-success",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "Medical Education",
    description:
      "Support resident training with real-time educational prompts, teaching moments, and comprehensive documentation examples.",
    impact: "Learn while you practice",
    gradient: "from-coral to-action-blue",
  },
];

const process = [
  {
    step: "01",
    title: "Start Your Session",
    description:
      "Click to begin and grant microphone access. The AI starts listening immediately, ready to capture your entire consultation.",
  },
  {
    step: "02",
    title: "Conduct Your Consultation",
    description:
      "Speak naturally with your patient. The system transcribes in real-time, identifies speakers, and extracts clinical context automatically.",
  },
  {
    step: "03",
    title: "Review & Export",
    description:
      "Get AI-generated summaries, suggested questions, and structured notes. Export documentation directly to your EHR system.",
  },
];

const stats = [
  { value: "95%", label: "Medical Accuracy" },
  { value: "< 300ms", label: "Response Time" },
  { value: "10min+", label: "Saved Per Visit" },
  { value: "24/7", label: "Availability" },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { setSessionId } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await api.createSession();
      setSessionId(response.session_id);
      navigate("/recording");
    } catch (err) {
      console.error("Failed to create session:", err);
      setError("Failed to create session. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-canvas/95 backdrop-blur-md border-b border-hairline">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/MediScribe_logo.png"
                alt="MediScribe AI"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="text-2xl font-semibold text-ink">MediScribe AI</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-body text-body-muted hover:text-ink transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-body text-body-muted hover:text-ink transition-colors font-medium"
              >
                How It Works
              </a>
              <a
                href="#use-cases"
                className="text-body text-body-muted hover:text-ink transition-colors font-medium"
              >
                Use Cases
              </a>
            </div>

            <button
              onClick={handleStartSession}
              disabled={isCreating}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-deep-green text-on-dark text-body font-medium rounded-pill hover:bg-deep-green/90 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {isCreating ? "Starting..." : "Get Started"}
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Hero Image */}
        <div className="absolute top-0 right-0 w-1/2 h-screen z-0 lg:block hidden">
          <img
            src="/MediScribe_hero.png"
            alt="MediScribe AI Interface"
            className="w-full h-full object-contain object-center"
            style={{
              maskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)",
              WebkitMaskImage:
                "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 60%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-canvas/10" />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 py-20">
          <div className="flex items-center min-h-[70vh]">
            <div className="max-w-4xl space-y-10 animate-fade-in lg:max-w-[55%]">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-8 text-ink">
                  Meet Your AI Clinical
                  <br />
                  <span className="bg-gradient-to-r from-deep-green via-action-blue to-coral bg-clip-text text-transparent">
                    Documentation Assistant
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-body-muted leading-relaxed mb-10 max-w-3xl">
                  Transform physician-patient conversations into structured clinical notes.
                  <span className="font-semibold text-ink">
                    {" "}
                    Real-time transcription, intelligent question generation, and automated documentation.
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mb-12">
                <button
                  onClick={handleStartSession}
                  disabled={isCreating}
                  className="inline-flex items-center justify-center px-8 py-4 bg-deep-green text-on-dark text-body-large font-medium rounded-pill hover:bg-deep-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Session
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Clinical Session
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-error/10 border border-error/30 rounded-lg text-error text-body">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-12 gap-y-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="flex flex-col items-start animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-deep-green to-action-blue bg-clip-text text-transparent mb-1">
                      {stat.value}
                    </div>
                    <div className="text-muted text-caption font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 bg-soft-stone">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 animate-slide-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-deep-green/10 rounded-pill mb-6">
              <svg className="w-5 h-5 text-deep-green" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              <span className="text-caption font-semibold text-deep-green">AI-Powered Healthcare Technology</span>
            </div>
            <h2 className="text-section-heading font-semibold text-ink mb-6 leading-tight">
              Why Physicians Choose Our AI Assistant
            </h2>
            <p className="text-body-large text-body-muted max-w-3xl mx-auto">
              Advanced voice intelligence that understands medical context, adapts to clinical workflows, and transforms conversations into actionable documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-canvas rounded-lg p-8 border border-hairline shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-r ${feature.gradient} p-3.5 mb-6 text-white`}>
                  {feature.icon}
                </div>
                <h3 className="text-feature-heading font-semibold mb-4 text-ink">{feature.title}</h3>
                <p className="text-body text-body-muted leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 bg-canvas">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-slide-in">
            <h2 className="text-section-heading font-semibold text-ink mb-6">
              How It Works
            </h2>
            <p className="text-body-large text-body-muted max-w-3xl mx-auto">
              Simple enough for busy clinicians, powerful enough for comprehensive documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {process.map((item, index) => (
              <div
                key={item.step}
                className="bg-soft-stone rounded-lg p-8 border border-hairline animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className="text-caption tracking-widest text-action-blue mb-4 font-semibold">STEP {item.step}</p>
                <h3 className="text-feature-heading font-semibold mb-4 text-ink">{item.title}</h3>
                <p className="text-body text-body-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="relative z-10 px-6 py-24 bg-soft-stone">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-slide-in">
            <h2 className="text-section-heading font-semibold text-ink mb-6">
              Built for Every Clinical Setting
            </h2>
            <p className="text-body-large text-body-muted max-w-3xl mx-auto">
              From primary care to specialized practices, our AI adapts to your unique clinical workflow and documentation needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((item, index) => (
              <div
                key={index}
                className="bg-canvas rounded-lg p-8 border border-hairline shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${item.gradient} flex items-center justify-center mb-5 text-white`}>
                  {item.icon}
                </div>
                <h3 className="text-feature-heading font-semibold mb-3 text-ink">{item.title}</h3>
                <p className="text-body text-body-muted leading-relaxed mb-5">{item.description}</p>
                <p className="text-action-blue font-semibold text-caption">{item.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative z-10 px-6 py-24 bg-canvas">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-soft-stone to-pale-blue rounded-xl p-12 md:p-16 border border-hairline shadow-lg">
            <div className="text-center animate-slide-in">
              <h2 className="text-card-heading md:text-section-heading font-semibold mb-6 text-ink">
                Built for Healthcare, Designed for Trust
              </h2>
              <p className="text-body-large text-body-muted max-w-3xl mx-auto mb-12">
                Our AI assistant combines cutting-edge technology with practical reliability, ensuring every healthcare professional can adopt it with confidence.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-canvas border border-hairline rounded-lg p-6">
                  <h3 className="text-body-large font-semibold text-ink mb-2">Medical-Grade Accuracy</h3>
                  <p className="text-body text-body-muted">
                    Trained on medical terminology and validated against clinical documentation standards.
                  </p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-6">
                  <h3 className="text-body-large font-semibold text-ink mb-2">HIPAA Compliance</h3>
                  <p className="text-body text-body-muted">
                    End-to-end encryption and secure handling of all patient health information.
                  </p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-6">
                  <h3 className="text-body-large font-semibold text-ink mb-2">Seamless Integration</h3>
                  <p className="text-body text-body-muted">
                    Works alongside your existing workflow without disrupting patient care.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-6 py-32 bg-soft-stone">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-deep-green to-action-blue rounded-xl p-16 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-card-heading md:text-section-heading font-semibold mb-6 text-on-dark">
                Start Transforming Your Clinical Documentation Today
              </h2>
              <p className="text-body-large text-on-dark/90 mb-10 max-w-2xl mx-auto">
                Experience the future of medical documentation with AI that understands healthcare.
              </p>
              <button
                onClick={handleStartSession}
                disabled={isCreating}
                className="inline-flex items-center justify-center px-10 py-4 bg-canvas text-deep-green text-body-large font-semibold rounded-pill hover:bg-soft-stone transition-all disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Session
                  </>
                ) : (
                  <>
                    Launch Clinical Session
                    <svg className="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-deep-green/20 to-action-blue/20" />
          </div>

          {/* Privacy Notice */}
          <div className="mt-16 bg-canvas rounded-lg p-8 border border-hairline">
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-deep-green/10 rounded-lg">
                <svg className="w-6 h-6 text-deep-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h4 className="text-body-large font-semibold mb-3 text-ink">Privacy & Data Protection</h4>
            <p className="text-body text-body-muted max-w-2xl mx-auto">
              Proof-of-concept application. No patient data is permanently stored. All sessions are cleared on browser close. All transmissions are encrypted following healthcare privacy standards and HIPAA compliance requirements.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-hairline bg-canvas">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img
              src="/MediScribe_logo.png"
              alt="MediScribe AI"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="text-2xl font-semibold text-ink">MediScribe AI</span>
          </div>
          <p className="text-caption text-muted">
            © 2025 MediScribe AI. Advanced voice intelligence for healthcare professionals.
          </p>
        </div>
      </footer>
    </div>
  );
};