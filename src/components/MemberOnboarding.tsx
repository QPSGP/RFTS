"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";

type Interest = {
  id: string;
  name: string;
  description?: string;
};

type MemberOnboardingProps = {
  plans: SubscriptionPlan[];
  goals: Interest[];
};

const mapStripClass = (id: string) => {
  if (id === "platinum") return "platinum";
  if (id === "gold") return "gold";
  return "bronze";
};

const timeZones = [
  "Pacific Time",
  "Mountain Time",
  "Central Time",
  "Eastern Time",
  "Alaska Time",
  "Hawaii Time",
  "Other"
];

const categoryMatchers = [
  {
    name: "Health",
    keywords: [
      "allergy",
      "asthma",
      "athletic",
      "eye",
      "sleep",
      "pain",
      "weight",
      "fitness",
      "health",
      "body",
      "energy",
      "healing",
      "immune",
      "nutrition",
      "smoking",
      "addiction"
    ]
  },
  {
    name: "Wealth",
    keywords: [
      "money",
      "wealth",
      "abundance",
      "success",
      "sales",
      "business",
      "career",
      "income",
      "practice",
      "marketing",
      "public speaking",
      "goal manifestation"
    ]
  },
  {
    name: "Relationship",
    keywords: [
      "relationship",
      "marriage",
      "love",
      "partner",
      "dating",
      "family",
      "parent",
      "jealousy",
      "monogamous",
      "polyamory"
    ]
  },
  {
    name: "Memory",
    keywords: [
      "memory",
      "focus",
      "concentration",
      "speed reading"
    ]
  },
  {
    name: "Inspiration",
    keywords: [
      "creativity",
      "confidence",
      "motivation",
      "life mission",
      "gratitude"
    ]
  },
  {
    name: "Spirituality",
    keywords: ["spiritual", "meditation", "mindfulness", "intuition", "psychic", "past life"]
  },
  {
    name: "Balance Life",
    keywords: [
      "balance",
      "calm",
      "stress",
      "anxiety",
      "depression",
      "trauma",
      "anger",
      "phobia",
      "drinking",
      "time",
      "procrastination",
      "habit",
      "productivity",
      "organization",
      "discipline"
    ]
  }
];

const categoryOrder = categoryMatchers.map((category) => category.name).concat("Other");

const getCategoryForGoal = (name: string) => {
  const value = name.toLowerCase();
  const match = categoryMatchers.find((category) =>
    category.keywords.some((keyword) => value.includes(keyword))
  );
  return match?.name || "Other";
};

export default function MemberOnboarding({ plans, goals }: MemberOnboardingProps) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const membershipDetails = [
    "Tailored Recordings Are Scheduled Based on Your Priorities.",
    "Push A Button And Listen While You Sleep!",
    "Listen to Tailored Recordings out of Sequence as Needed",
    "Unlimited Access to All Recordings in the Success Center Library!",
    "Includes a 15-minute Private Goal Setting Consultation every 90 days with a Success Center hypnotherapist/coach ($444 value annual benefit). Call 800-GOAL-NOW to set your appointment today."
  ];
  const membershipNote =
    'For best results for reprogramming your subconscious with our system is to have a private "Life Guidance Discovery Session" allowing you to really discover where you are, where you want to go, and how to get there! We then design a customized audio specifically designed by you, for you!  (Membership is reduced to $29.95.)';
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [playsPerNight, setPlaysPerNight] = useState<1 | 2>(2);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    gender: "",
    yearBorn: "",
    contactNumber: "",
    bestContactTimes: "",
    timeZone: "Pacific Time",
    occupation: "",
    incomeGoal: "",
    incomeGoalYear: "",
    incomeGoalRelation: "",
    isFirstResponder: false,
    wantsPracticeGrowth: false,
    adultConsent: false,
    wantsPolyamory: false,
    hadLgdSession: false,
    referralSource: ""
  });

  const visiblePlans = useMemo(() => {
    const membershipOnly = plans.filter((plan) => plan.id === "platinum");
    return membershipOnly.length > 0 ? membershipOnly : plans;
  }, [plans]);

  useEffect(() => {
    if (!selectedPlanId && visiblePlans.length > 0) {
      setSelectedPlanId(visiblePlans[0].id);
    }
  }, [selectedPlanId, visiblePlans]);

  const selectedPlan = useMemo(
    () => visiblePlans.find((plan) => plan.id === selectedPlanId),
    [visiblePlans, selectedPlanId]
  );
  const sortedGoals = useMemo(
    () => goals.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [goals]
  );
  const filteredGoals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedGoals;
    return sortedGoals.filter((goal) => goal.name.toLowerCase().includes(term));
  }, [searchTerm, sortedGoals]);
  const goalNameById = useMemo(() => {
    const map = new Map<string, Interest>();
    goals.forEach((goal) => {
      map.set(goal.id, goal);
    });
    return map;
  }, [goals]);
  const orderedGoals = useMemo(
    () =>
      goalIds.map((id) => ({
        id,
        name: goalNameById.get(id)?.name || "Unknown goal"
      })),
    [goalIds, goalNameById]
  );
  const groupedGoals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      return { "Search Results": filteredGoals };
    }
    const groups: Record<string, Interest[]> = {};
    filteredGoals.forEach((goal) => {
      const category = getCategoryForGoal(goal.name);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(goal);
    });
    return groups;
  }, [filteredGoals, searchTerm]);
  const categoryKeys = useMemo(() => {
    if (searchTerm.trim()) {
      return ["Search Results"];
    }
    return categoryOrder.filter((category) => groupedGoals[category]?.length);
  }, [groupedGoals, searchTerm]);

  useEffect(() => {
    if (openCategory && !categoryKeys.includes(openCategory)) {
      setOpenCategory(null);
    }
  }, [categoryKeys, openCategory]);

  const toggleGoal = (id: string) => {
    setGoalIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((goal) => goal !== id);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const moveGoal = (fromIndex: number, toIndex: number) => {
    setGoalIds((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const nextStep = () => {
    setStatus(null);
    if (step === 1) {
      if (!selectedPlanId) {
        setStatus("Select a subscription package to continue.");
        return;
      }
      if (goalIds.length === 0) {
        setStatus("Select at least one goal to continue.");
        return;
      }
    }
    if (step === 2) {
      if (!profile.firstName || !profile.lastName || !profile.email || !profile.password) {
        setStatus("Complete the required personal details to continue.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const previousStep = () => {
    setStatus(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const submit = async () => {
    if (!selectedPlanId || !selectedPlan) {
      setStatus("Select a subscription package to continue.");
      return;
    }
    setStatus(null);
    setIsSubmitting(true);
    const response = await fetch("/api/member/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: selectedPlanId,
        email: profile.email,
        password: profile.password,
        goalIds,
        playsPerNight,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          gender: profile.gender,
          yearBorn: profile.yearBorn ? Number(profile.yearBorn) : undefined,
          contactNumber: profile.contactNumber,
          bestContactTimes: profile.bestContactTimes,
          timeZone: profile.timeZone,
          occupation: profile.occupation,
          incomeGoal: profile.incomeGoal,
          incomeGoalYear: profile.incomeGoalYear ? Number(profile.incomeGoalYear) : undefined,
          incomeGoalRelation: profile.incomeGoalRelation,
          isFirstResponder: profile.isFirstResponder,
          wantsPracticeGrowth: profile.wantsPracticeGrowth,
          adultConsent: profile.adultConsent,
          wantsPolyamory: profile.wantsPolyamory,
          hadLgdSession: profile.hadLgdSession,
          referralSource: profile.referralSource
        }
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Signup failed. Please try again.");
      setIsSubmitting(false);
      return;
    }
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setStatus("Checkout session did not return a URL.");
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="stepper">
        {["Subscription & Goals", "Personal Details", "Payment"].map((label, index) => (
          <div key={label} className="stepper-item">
            <span className={`stepper-dot ${index + 1 === step ? "active" : ""}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="membership-package-section">
            <div className="plan-grid">
            {visiblePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`plan-card plan-card-signup ${selectedPlanId === plan.id ? "selected" : ""}`}
                onClick={() => setSelectedPlanId(plan.id)}
                style={{ cursor: "pointer" }}
              >
                <div className={`plan-strip ${mapStripClass(plan.id)}`}>
                  MEMBERSHIP PACKAGE
                </div>
                <div className="plan-body">
                  <div className="plan-trial plan-trial-emphasis">{plan.trialDays}-Day Free Trial</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#4b5563" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
                      $39.95/mo. + tax and fees
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {membershipDetails.map((line) => (
                        <li key={line} style={{ marginTop: 6 }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 8, fontStyle: "italic", fontWeight: 700 }}>
                      {membershipNote}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>
          <div className="section-heading" style={{ marginTop: 24 }}>
            Goal Selection (up to 10)
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Your selected goals (saved order)</h3>
            {orderedGoals.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No goals selected yet.</p>
            ) : (
              <div className="goal-stack">
                {orderedGoals.map((goal, index) => (
                  <div
                    key={goal.id}
                    className="goal-item"
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <strong style={{ minWidth: 24 }}>{index + 1}.</strong>
                    <span style={{ flex: 1 }}>{goal.name}</span>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => moveGoal(index, index - 1)}
                      disabled={index === 0}
                      style={{ padding: "6px 10px", fontSize: 12 }}
                    >
                      Up
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => moveGoal(index, index + 1)}
                      disabled={index === orderedGoals.length - 1}
                      style={{ padding: "6px 10px", fontSize: 12 }}
                    >
                      Down
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Find your goals</h3>
            <input
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                width: "100%",
                marginTop: 8
              }}
              placeholder="Search goals"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                if (event.target.value.trim()) {
                  setOpenCategory("Search Results");
                }
              }}
            />
          </div>
          <div className="goal-list" style={{ marginTop: 16 }}>
            {categoryKeys.map((category) => (
              <div key={category} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <button
                    className="button button-secondary"
                    type="button"
                  onClick={() =>
                    setOpenCategory((prev) => (prev === category ? null : category))
                  }
                    style={{ flex: 1, textAlign: "left" }}
                  >
                    {category}
                  </button>
                  <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>
                    {groupedGoals[category]?.length || 0}
                  </span>
                </div>
                {openCategory === category && (
                  <div className="grid grid-2" style={{ marginTop: 12 }}>
                    {(groupedGoals[category] || []).map((goal) => (
                      <label
                        key={goal.id}
                        className="goal-item"
                        style={{ cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={goalIds.includes(goal.id)}
                          onChange={() => toggleGoal(goal.id)}
                          disabled={!goalIds.includes(goal.id) && goalIds.length >= 10}
                          style={{ marginRight: 8 }}
                        />
                        <strong>{goal.name}</strong>
                        {goal.description && <p>{goal.description}</p>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Sessions per night</h3>
            <p style={{ color: "#4b5563" }}>
              Choose to play 1 or 2 recordings each night (default is 2).
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="playsPerNight"
                  checked={playsPerNight === 2}
                  onChange={() => setPlaysPerNight(2)}
                />
                2 per night (recommended)
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="playsPerNight"
                  checked={playsPerNight === 1}
                  onChange={() => setPlaysPerNight(1)}
                />
                1 per night
              </label>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="section-heading">Personal Details</div>
          <p style={{ color: "#4b5563" }}>
            Please fill out the following fields so we may serve you better.
          </p>
          <div className="grid grid-2">
            <input
              placeholder="First Name *"
              value={profile.firstName}
              onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Last Name *"
              value={profile.lastName}
              onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Email *"
              type="email"
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Password *"
              type="password"
              value={profile.password}
              onChange={(event) => setProfile({ ...profile, password: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Gender"
              value={profile.gender}
              onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Year born"
              value={profile.yearBorn}
              onChange={(event) => setProfile({ ...profile, yearBorn: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Best Contact Number"
              value={profile.contactNumber}
              onChange={(event) =>
                setProfile({ ...profile, contactNumber: event.target.value })
              }
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Best Time(s) Reached"
              value={profile.bestContactTimes}
              onChange={(event) =>
                setProfile({ ...profile, bestContactTimes: event.target.value })
              }
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <select
              value={profile.timeZone}
              onChange={(event) => setProfile({ ...profile, timeZone: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            >
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <input
              placeholder="Occupation"
              value={profile.occupation}
              onChange={(event) => setProfile({ ...profile, occupation: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Your annual income goal is..."
              value={profile.incomeGoal}
              onChange={(event) => setProfile({ ...profile, incomeGoal: event.target.value })}
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="Year you intend to reach that goal"
              value={profile.incomeGoalYear}
              onChange={(event) =>
                setProfile({ ...profile, incomeGoalYear: event.target.value })
              }
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
            <input
              placeholder="This goal is ____ your current income"
              value={profile.incomeGoalRelation}
              onChange={(event) =>
                setProfile({ ...profile, incomeGoalRelation: event.target.value })
              }
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </div>
          <div className="grid" style={{ marginTop: 16 }}>
            <label className="card" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={profile.isFirstResponder}
                onChange={(event) =>
                  setProfile({ ...profile, isFirstResponder: event.target.checked })
                }
                style={{ marginRight: 8 }}
              />
              I am a first responder or in the healthcare industry.
            </label>
            <label className="card" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={profile.wantsPracticeGrowth}
                onChange={(event) =>
                  setProfile({ ...profile, wantsPracticeGrowth: event.target.checked })
                }
                style={{ marginRight: 8 }}
              />
              I am interested in building my private hypnotherapy, coaching, or healing
              practice.
            </label>
            <label className="card" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={profile.adultConsent}
                onChange={(event) =>
                  setProfile({ ...profile, adultConsent: event.target.checked })
                }
                style={{ marginRight: 8 }}
              />
              I am an adult and am willing to hear audios with mature content.
            </label>
            <label className="card" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={profile.wantsPolyamory}
                onChange={(event) =>
                  setProfile({ ...profile, wantsPolyamory: event.target.checked })
                }
                style={{ marginRight: 8 }}
              />
              I would like to hear audios related to polyamory.
            </label>
            <label className="card" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={profile.hadLgdSession}
                onChange={(event) =>
                  setProfile({ ...profile, hadLgdSession: event.target.checked })
                }
                style={{ marginRight: 8 }}
              />
              Have you had a Life Guidance Discovery Session?
            </label>
            <input
              placeholder="How did you find us? If someone referred you, who?"
              value={profile.referralSource}
              onChange={(event) =>
                setProfile({ ...profile, referralSource: event.target.value })
              }
              style={{ padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="section-heading">Review & Payment</div>
          <div className="card">
            <p>
              <strong>Plan:</strong> {selectedPlan?.name}
            </p>
            <p>
              <strong>Goals:</strong> {goalIds.length} selected
            </p>
            <p>
              <strong>Sessions per night:</strong> {playsPerNight}
            </p>
            <p>
              <strong>Member:</strong> {profile.firstName} {profile.lastName}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
          </div>
          <p style={{ color: "#64748b" }}>
            You will be redirected to secure Stripe checkout.
          </p>
        </>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        {step > 1 && (
          <button className="button button-secondary" type="button" onClick={previousStep}>
            Back
          </button>
        )}
        {step < 3 && (
          <button className="button" type="button" onClick={nextStep}>
            Continue
          </button>
        )}
        {step === 3 && (
          <button className="button" type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Redirecting..." : "Continue to Payment"}
          </button>
        )}
      </div>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
