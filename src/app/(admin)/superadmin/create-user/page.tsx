"use client";

import React, { useMemo, useState, useEffect } from "react";
import { apiPost } from "@/utils/api";
import {
  Building2,
  Mail,
  Phone,
  Globe2,
  Store,
  ShoppingBag,
  UtensilsCrossed,
  Wrench,
  Factory,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  ShieldCheck,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

const steps = [
  "Business Details",
  "Classification",
  "Measurement Setup",
  "Owner Setup",
  "Review & Create",
];

import { apiGet } from "@/utils/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(15,23,42,0.75)",
  color: "#fff",
  fontSize: 15,
  outline: "none",
  transition: "all 0.25s ease",
  marginTop: 8,
};

const labelStyle: React.CSSProperties = {
  color: "#e2e8f0",
  fontWeight: 600,
  fontSize: 14,
};

const cardStyle: React.CSSProperties = {
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: 20,
  backdropFilter: "blur(18px)",
};

const CreateTenantPage = () => {
  // Submission state (must be inside component)
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Dummy reCAPTCHA token for now (replace with real integration if needed)
  const recaptchaToken = "dummy-token";

  // Handler for Create Workspace
  const handleCreateWorkspace = async () => {
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      // Map frontend fields to backend DTO
      const payload = {
        name: businessDetails.name,
        businessType: classifications.find((c) => c.id === businessDetails.classificationId)?.name || "",
        branchName: businessDetails.name ? businessDetails.name + " Main Branch" : "Main Branch",
        contactEmail: businessDetails.contactEmail,
        contactPhone: businessDetails.contactPhone,
        country: businessDetails.country,
        owner: {
          name: ownerDetails.fullName,
          email: ownerDetails.email,
          password: ownerDetails.password,
        },
        recaptchaToken,
      };
      await apiPost("/tenant", payload);
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create workspace");
    } finally {
      setSubmitLoading(false);
    }
  };
  const [step, setStep] = useState(0);

  const [businessDetails, setBusinessDetails] = useState({
    name: "",
    classificationId: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
  });

  // Classifications state
  const [classifications, setClassifications] = useState<any[]>([]);
  const [classificationsLoading, setClassificationsLoading] = useState(false);
  const [classificationsError, setClassificationsError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 1) {
      setClassificationsLoading(true);
      apiGet<any[]>("/admin/classifications")
        .then((data) => {
          setClassifications(data);
          setClassificationsLoading(false);
        })
        .catch((err) => {
          setClassificationsError(err?.message || "Failed to load classifications");
          setClassificationsLoading(false);
        });
    }
  }, [step]);

  const [measurementSetup, setMeasurementSetup] = useState({
    unitSystem: "metric",
    currency: "KES",
  });

  const [ownerDetails, setOwnerDetails] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const isStepValid = useMemo(() => {
    if (step === 0) {
      return (
        businessDetails.name &&
        businessDetails.contactEmail &&
        businessDetails.country
      );
    }

    if (step === 1) {
      return businessDetails.classificationId;
    }

    if (step === 3) {
      return (
        ownerDetails.fullName &&
        ownerDetails.email &&
        ownerDetails.password
      );
    }

    return true;
  }, [step, businessDetails, ownerDetails]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#1e293b,#020617 65%)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          ...cardStyle,
          padding: 36,
          boxShadow:
            "0 10px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(59,130,246,0.12)",
              color: "#93c5fd",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            <ShieldCheck size={16} />
            Adeera Workspace Setup
          </div>

          <h1
            style={{
              color: "#fff",
              fontSize: 36,
              margin: 0,
              fontWeight: 800,
            }}
          >
            Create Your Workspace
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: 12,
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 620,
            }}
          >
            Set up your business profile and configure your POS
            environment for operations, inventory and sales management.
          </p>
        </div>

        {/* Stepper */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 50,
            overflowX: "auto",
          }}
        >
          {steps.map((label, idx) => {
            const active = idx === step;
            const completed = idx < step;

            return (
              <React.Fragment key={label}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: completed
                        ? "linear-gradient(135deg,#22c55e,#16a34a)"
                        : active
                        ? "linear-gradient(135deg,#2563eb,#06b6d4)"
                        : "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 700,
                      border: active
                        ? "3px solid rgba(255,255,255,0.15)"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: active
                        ? "0 0 24px rgba(37,99,235,0.45)"
                        : "none",
                      transition: "0.25s ease",
                    }}
                  >
                    {completed ? <Check size={20} /> : idx + 1}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: active ? "#fff" : "#94a3b8",
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 999,
                      margin: "0 10px",
                      background:
                        idx < step
                          ? "linear-gradient(90deg,#2563eb,#06b6d4)"
                          : "rgba(255,255,255,0.08)",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 1 */}
            {step === 0 && (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    marginBottom: 28,
                    fontSize: 24,
                  }}
                >
                  Business Details
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(260px,1fr))",
                    gap: 20,
                  }}
                >
                  <label style={labelStyle}>
                    Business Name
                    <div style={{ position: "relative" }}>
                      <Building2
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <input
                        type="text"
                        placeholder="Adeera Technologies"
                        value={businessDetails.name}
                        onChange={(e) =>
                          setBusinessDetails({
                            ...businessDetails,
                            name: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                        }}
                      />
                    </div>
                  </label>

                  <label style={labelStyle}>
                    Contact Email
                    <div style={{ position: "relative" }}>
                      <Mail
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <input
                        type="email"
                        placeholder="admin@business.com"
                        value={businessDetails.contactEmail}
                        onChange={(e) =>
                          setBusinessDetails({
                            ...businessDetails,
                            contactEmail: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                        }}
                      />
                    </div>
                  </label>

                  <label style={labelStyle}>
                    Contact Phone
                    <div style={{ position: "relative" }}>
                      <Phone
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <input
                        type="tel"
                        placeholder="+254 700 000000"
                        value={businessDetails.contactPhone}
                        onChange={(e) =>
                          setBusinessDetails({
                            ...businessDetails,
                            contactPhone: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                        }}
                      />
                    </div>
                  </label>

                  <label style={labelStyle}>
                    Country
                    <div style={{ position: "relative" }}>
                      <Globe2
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <select
                        value={businessDetails.country}
                        onChange={(e) =>
                          setBusinessDetails({
                            ...businessDetails,
                            country: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                          appearance: "none",
                        }}
                      >
                        <option value="">Select Country</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="United States">
                          United States
                        </option>
                      </select>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    marginBottom: 12,
                    fontSize: 24,
                  }}
                >
                  Select Business Classification
                </h2>

                <p
                  style={{
                    color: "#94a3b8",
                    marginBottom: 28,
                  }}
                >
                  Choose the classification that best matches your business operations.
                </p>

                {classificationsLoading ? (
                  <div style={{ color: "#fff", margin: "32px 0" }}>Loading classifications...</div>
                ) : classificationsError ? (
                  <div style={{ color: "#f00", margin: "32px 0" }}>{classificationsError}</div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                      gap: 20,
                    }}
                  >
                    {classifications.map((item) => {
                      const selected = businessDetails.classificationId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            setBusinessDetails({
                              ...businessDetails,
                              classificationId: item.id,
                            })
                          }
                          style={{
                            ...cardStyle,
                            cursor: "pointer",
                            border: selected
                              ? "1px solid #3b82f6"
                              : "1px solid rgba(255,255,255,0.08)",
                            background: selected
                              ? item.color || "rgba(37,99,235,0.18)"
                              : "rgba(15,23,42,0.7)",
                            transition: "0.25s ease",
                          }}
                        >
                          <div style={{ color: "#60a5fa", fontSize: 28 }}>
                            {item.icon}
                          </div>

                          <h3
                            style={{
                              color: "#fff",
                              marginTop: 18,
                              marginBottom: 8,
                            }}
                          >
                            {item.name}
                          </h3>

                          <p
                            style={{
                              color: "#94a3b8",
                              fontSize: 14,
                              lineHeight: 1.6,
                            }}
                          >
                            {item.units && item.units.length > 0
                              ? `Units: ${item.units.map((u: any) => u.abbreviation).join(", ")}`
                              : "No units defined"}
                          </p>
                          <div style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>
                            {item._count?.primaryTenants ?? 0} tenants
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    marginBottom: 28,
                    fontSize: 24,
                  }}
                >
                  Measurement Setup
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(260px,1fr))",
                    gap: 24,
                  }}
                >
                  <div style={cardStyle}>
                    <h3 style={{ color: "#fff", marginBottom: 20 }}>
                      Unit System
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                      }}
                    >
                      {["metric", "imperial"].map((unit) => (
                        <button
                          key={unit}
                          onClick={() =>
                            setMeasurementSetup({
                              ...measurementSetup,
                              unitSystem: unit,
                            })
                          }
                          style={{
                            flex: 1,
                            padding: "14px 18px",
                            borderRadius: 14,
                            border: "none",
                            cursor: "pointer",
                            color: "#fff",
                            fontWeight: 700,
                            background:
                              measurementSetup.unitSystem === unit
                                ? "linear-gradient(135deg,#2563eb,#06b6d4)"
                                : "rgba(255,255,255,0.06)",
                          }}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h3 style={{ color: "#fff", marginBottom: 20 }}>
                      Currency
                    </h3>

                    <select
                      value={measurementSetup.currency}
                      onChange={(e) =>
                        setMeasurementSetup({
                          ...measurementSetup,
                          currency: e.target.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="KES">KES</option>
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    marginBottom: 28,
                    fontSize: 24,
                  }}
                >
                  Owner Setup
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(260px,1fr))",
                    gap: 20,
                  }}
                >
                  <label style={labelStyle}>
                    Full Name
                    <div style={{ position: "relative" }}>
                      <User
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <input
                        type="text"
                        value={ownerDetails.fullName}
                        onChange={(e) =>
                          setOwnerDetails({
                            ...ownerDetails,
                            fullName: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                        }}
                        placeholder="John Doe"
                      />
                    </div>
                  </label>

                  <label style={labelStyle}>
                    Email
                    <div style={{ position: "relative" }}>
                      <Mail
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 22,
                          color: "#64748b",
                        }}
                      />

                      <input
                        type="email"
                        value={ownerDetails.email}
                        onChange={(e) =>
                          setOwnerDetails({
                            ...ownerDetails,
                            email: e.target.value,
                          })
                        }
                        style={{
                          ...inputStyle,
                          paddingLeft: 44,
                        }}
                        placeholder="owner@business.com"
                      />
                    </div>
                  </label>

                  <label style={labelStyle}>
                    Password
                    <input
                      type="password"
                      value={ownerDetails.password}
                      onChange={(e) =>
                        setOwnerDetails({
                          ...ownerDetails,
                          password: e.target.value,
                        })
                      }
                      style={inputStyle}
                      placeholder="Create secure password"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 5 */}
            {step === 4 && (
              <div>
                <h2
                  style={{
                    color: "#fff",
                    marginBottom: 28,
                    fontSize: 24,
                  }}
                >
                  Review & Create
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(280px,1fr))",
                    gap: 20,
                  }}
                >
                  <div style={cardStyle}>
                    <h3 style={{ color: "#fff" }}>
                      Business Information
                    </h3>

                    <div
                      style={{
                        marginTop: 18,
                        color: "#94a3b8",
                        lineHeight: 2,
                      }}
                    >
                      <div>
                        <strong>Name:</strong>{" "}
                        {businessDetails.name}
                      </div>

                      <div>
                        <strong>Email:</strong>{" "}
                        {businessDetails.contactEmail}
                      </div>

                      <div>
                        <strong>Phone:</strong>{" "}
                        {businessDetails.contactPhone}
                      </div>

                      <div>
                        <strong>Country:</strong>{" "}
                        {businessDetails.country}
                      </div>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h3 style={{ color: "#fff" }}>
                      Configuration
                    </h3>

                    <div
                      style={{
                        marginTop: 18,
                        color: "#94a3b8",
                        lineHeight: 2,
                      }}
                    >
                      <div>
                        <strong>Classification:</strong>{" "}
                        {classifications.find((c) => c.id === businessDetails.classificationId)?.name || ""}
                      </div>

                      <div>
                        <strong>Unit System:</strong>{" "}
                        {measurementSetup.unitSystem}
                      </div>

                      <div>
                        <strong>Currency:</strong>{" "}
                        {measurementSetup.currency}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateWorkspace}
                  disabled={submitLoading}
                  style={{
                    marginTop: 30,
                    width: "100%",
                    padding: "16px 24px",
                    borderRadius: 16,
                    border: "none",
                    background:
                      submitLoading
                        ? "#334155"
                        : "linear-gradient(135deg,#2563eb,#06b6d4)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: submitLoading ? "not-allowed" : "pointer",
                    boxShadow:
                      "0 10px 30px rgba(37,99,235,0.35)",
                    opacity: submitLoading ? 0.7 : 1,
                  }}
                >
                  {submitLoading ? "Creating..." : "Create Workspace"}
                </button>
                {submitError && (
                  <div style={{ color: "#f00", marginTop: 18 }}>{submitError}</div>
                )}
                {submitSuccess && (
                  <div style={{ color: "#22c55e", marginTop: 18 }}>Workspace created successfully!</div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 50,
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={prev}
            disabled={step === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 22px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "#fff",
              cursor: step === 0 ? "not-allowed" : "pointer",
              opacity: step === 0 ? 0.5 : 1,
              fontWeight: 700,
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {step !== steps.length - 1 && (
            <button
              onClick={next}
              disabled={!isStepValid}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 22px",
                borderRadius: 14,
                border: "none",
                background: isStepValid
                  ? "linear-gradient(135deg,#2563eb,#06b6d4)"
                  : "#334155",
                color: "#fff",
                cursor: isStepValid
                  ? "pointer"
                  : "not-allowed",
                fontWeight: 700,
                boxShadow: isStepValid
                  ? "0 10px 30px rgba(37,99,235,0.25)"
                  : "none",
              }}
            >
              Next Step
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {/* Bottom Hint */}
        <div
          style={{
            marginTop: 20,
            color: "#64748b",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Progress is saved automatically as you continue setup.
        </div>
      </div>
    </div>
  );
};

export default CreateTenantPage;