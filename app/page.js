"use client";

import { useState, useRef, useEffect, React } from "react";
import ReactStandard from "react";
import { saveAs } from "file-saver";
import { processFiles } from "../utils/parser";
import styles from "./page.module.css";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [exportType, setExportType] = useState("csv");
  const [customDomain, setCustomDomain] = useState("minburi.ac.th");
  const [batchSize, setBatchSize] = useState(100);
  const [orgUnitPVC, setOrgUnitPVC] = useState("");
  const [orgUnitPVS, setOrgUnitPVS] = useState("");
  const [usePVC, setUsePVC] = useState(true);
  const [usePVS, setUsePVS] = useState(true);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);
  const [activeModal, setActiveModal] = useState(null); // 'guide' | 'privacy' | 'contact' | null

  // Prevent scroll when modal is active
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal]);

  // Load settings on mount
  useEffect(() => {
    const savedDomain = localStorage.getItem("student_export_domain");
    const savedBatchSize = localStorage.getItem("student_export_batchSize");
    const savedPVC = localStorage.getItem("student_export_orgUnitPVC");
    const savedPVS = localStorage.getItem("student_export_orgUnitPVS");
    const savedUsePVC = localStorage.getItem("student_export_usePVC");
    const savedUsePVS = localStorage.getItem("student_export_usePVS");

    if (savedDomain !== null) setCustomDomain(savedDomain);
    if (savedBatchSize !== null) setBatchSize(parseInt(savedBatchSize) || 100);
    if (savedPVC !== null) setOrgUnitPVC(savedPVC);
    if (savedPVS !== null) setOrgUnitPVS(savedPVS);
    if (savedUsePVC !== null) setUsePVC(savedUsePVC === "true");
    if (savedUsePVS !== null) setUsePVS(savedUsePVS === "true");
    setIsSettingsLoaded(true);
  }, []);

  // Save settings on changes
  useEffect(() => {
    if (!isSettingsLoaded) return;
    localStorage.setItem("student_export_domain", customDomain);
    localStorage.setItem("student_export_batchSize", String(batchSize));
    localStorage.setItem("student_export_orgUnitPVC", orgUnitPVC);
    localStorage.setItem("student_export_orgUnitPVS", orgUnitPVS);
    localStorage.setItem("student_export_usePVC", String(usePVC));
    localStorage.setItem("student_export_usePVS", String(usePVS));
  }, [
    customDomain,
    batchSize,
    orgUnitPVC,
    orgUnitPVS,
    usePVC,
    usePVS,
    isSettingsLoaded,
  ]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccessMsg(null);
    setParsedData(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".xlsx"),
      );
      if (droppedFiles.length === 0) {
        setError("กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น");
        return;
      }
      setFiles((prev) => {
        const newFiles = [...prev];
        droppedFiles.forEach((f) => {
          if (!newFiles.some((existing) => existing.name === f.name)) {
            newFiles.push({
              file: f,
              name: f.name,
              status: "pending",
              studentCount: null,
              error: null,
            });
          }
        });
        return newFiles;
      });
    }
  };

  const handleFileSelect = (e) => {
    setError(null);
    setSuccessMsg(null);
    setParsedData(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter((f) =>
        f.name.endsWith(".xlsx"),
      );
      if (selectedFiles.length === 0) {
        setError("กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น");
        return;
      }
      setFiles((prev) => {
        const newFiles = [...prev];
        selectedFiles.forEach((f) => {
          if (!newFiles.some((existing) => existing.name === f.name)) {
            newFiles.push({
              file: f,
              name: f.name,
              status: "pending",
              studentCount: null,
              error: null,
            });
          }
        });
        return newFiles;
      });
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError("กรุณาเลือกไฟล์ก่อนทำการประมวลผล");
      return;
    }

    if (!usePVC && !usePVS) {
      setError("กรุณาเลือกอย่างน้อยหนึ่งระดับชั้น (ปวช. หรือ ปวส.)");
      return;
    }

    if (exportType !== "addmultiuser") {
      if (usePVC && !orgUnitPVC.trim()) {
        setError("กรุณากรอก Org Unit Path สำหรับ ปวช.");
        return;
      }

      if (usePVS && !orgUnitPVS.trim()) {
        setError("กรุณากรอก Org Unit Path สำหรับ ปวส.");
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    setParsedData(null);

    try {
      const rawFiles = files.map((f) => f.file);

      const onProgress = (fileName, status, studentCount, errMsg = null) => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.name === fileName) {
              return {
                ...f,
                status,
                studentCount:
                  status === "success" ? studentCount : f.studentCount,
                error: errMsg,
              };
            }
            return f;
          }),
        );
      };

      const result = await processFiles(
        rawFiles,
        exportType,
        customDomain,
        batchSize,
        orgUnitPVC.trim(),
        orgUnitPVS.trim(),
        onProgress,
        usePVC,
        usePVS,
      );

      setParsedData({
        summary: result.summary,
        preview: result.preview,
      });

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName =
        exportType === "csv"
          ? `Google_Workspace_Export_${dateStr}.zip`
          : exportType === "addmultiuser"
          ? `AddMultiUser_Export_${dateStr}.zip`
          : `Student_Report_Export_${dateStr}.zip`;

      saveAs(result.zipBlob, fileName);
      setSuccessMsg("ประมวลผลและดาวน์โหลดไฟล์สำเร็จ!");
      setCurrentStep(4);
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    setParsedData(null);
    setSuccessMsg(null);
  };

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const isFormValid = () => {
    if (!customDomain.trim()) return false;
    if (!usePVC && !usePVS) return false;
    if (exportType !== "addmultiuser") {
      if (usePVC && !orgUnitPVC.trim()) return false;
      if (usePVS && !orgUnitPVS.trim()) return false;
    }
    return true;
  };

  const StepIndicator = () => {
    const steps = [
      { num: 1, label: "เลือกรูปแบบ" },
      { num: 2, label: "ตั้งค่าระบบ" },
      { num: 3, label: "อัปโหลดไฟล์" },
      { num: 4, label: "ผลลัพธ์" },
    ];

    return (
      <div className={styles.stepIndicator}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.num;
          const isComplete = currentStep > s.num;

          let circleClass = styles.stepCircleInactive;
          let labelClass = styles.stepLabelInactive;

          if (isActive) {
            circleClass = styles.stepCircleActive;
            labelClass = styles.stepLabelActive;
          } else if (isComplete) {
            circleClass = styles.stepCircleComplete;
            labelClass = styles.stepLabelComplete;
          }

          return (
            <div key={s.num} style={{ display: "flex", alignItems: "center", flex: idx === steps.length - 1 ? "0 0 auto" : "1 1 auto" }}>
              <div className={styles.stepItem}>
                <div className={`${styles.stepCircle} ${circleClass}`}>
                  {isComplete ? (
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      check
                    </span>
                  ) : (
                    s.num
                  )}
                </div>
                <span className={`${styles.stepLabel} ${labelClass}`}>{s.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`${styles.stepLine} ${
                    currentStep > s.num + 1
                      ? styles.stepLineComplete
                      : currentStep === s.num + 1
                      ? styles.stepLineActive
                      : styles.stepLineInactive
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className={styles.logo} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--primary)" }}>
                school
              </span>
              SEAS
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={currentStep === 4 ? styles.containerExpanded : styles.container}>
          {/* Step Indicator */}
          <StepIndicator />

          {/* Step Content */}
          {currentStep === 1 && (
            <div>
              <div className={styles.stepHeader}>
                <div className={styles.trustBadge}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    verified_user
                  </span>
                  ทำงานแบบ Client-Side 100% — ข้อมูลปลอดภัย
                </div>
                <h1 className={styles.pageTitle}>Student Email Account System</h1>
                <p className={styles.pageSubtitle}>
                  ระบบอัพโหลดบัญชีอีเมลสถานศึกษา (Google Workspace Education)
                </p>
              </div>

              <h2 className={styles.sectionTitle}>
                <span className="material-symbols-outlined">pageview</span>
                เลือกรูปแบบการส่งออก
              </h2>

              <div className={styles.cardsGrid}>
                <div
                  className={`${styles.selectionCard} ${
                    exportType === "csv" ? styles.selectionCardActive : ""
                  }`}
                  onClick={() => setExportType("csv")}
                >
                  <div className={`${styles.cardIcon} ${styles.cardIconCsv}`}>
                    <span className="material-symbols-outlined">csv</span>
                  </div>
                  <h3 className={styles.cardTitle}>CSV — Google Workspace</h3>
                  <p className={styles.cardDesc}>
                    สำหรับนำเข้ารายชื่อบัญชีผู้ใช้ในระบบ Google Workspace Admin
                    (แยกไฟล์ย่อยตามขนาดกลุ่มคนโดยอัตโนมัติ)
                  </p>
                  <div className={styles.cardFeature}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "4px" }}>
                      splitscreen
                    </span>
                    แบ่งกลุ่มตามจำนวนคนต่อไฟล์ได้
                  </div>
                  <span className={`${styles.checkIndicator} material-symbols-outlined`}>
                    check_circle
                  </span>
                </div>

                <div
                  className={`${styles.selectionCard} ${
                    exportType === "excel" ? styles.selectionCardActive : ""
                  }`}
                  onClick={() => setExportType("excel")}
                >
                  <div className={`${styles.cardIcon} ${styles.cardIconExcel}`}>
                    <span className="material-symbols-outlined">table_chart</span>
                  </div>
                  <h3 className={styles.cardTitle}>Excel — รายงาน</h3>
                  <p className={styles.cardDesc}>
                    สำหรับพิมพ์รายงานทั่วไป จัดรูปแบบตารางและสรุปรายชื่อผู้ใช้ที่ผ่านการแปลงข้อมูล
                  </p>
                  <div className={styles.cardFeature}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "4px" }}>
                      description
                    </span>
                    สรุปรายงานแยกตามระดับชั้น
                  </div>
                  <span className={`${styles.checkIndicator} material-symbols-outlined`}>
                    check_circle
                  </span>
                </div>

                <div
                  className={`${styles.selectionCard} ${
                    exportType === "addmultiuser" ? styles.selectionCardActive : ""
                  }`}
                  onClick={() => setExportType("addmultiuser")}
                >
                  <div className={`${styles.cardIcon} ${styles.cardIconMultiuser}`}>
                    <span className="material-symbols-outlined">group_add</span>
                  </div>
                  <h3 className={styles.cardTitle}>Excel — Multi-User</h3>
                  <p className={styles.cardDesc}>
                    สำหรับนำเข้าบัญชีผู้ใช้ในรูปแบบ addmultiuser (ชื่อ, นามสกุล, อีเมลล์, username, passwprd)
                  </p>
                  <div className={styles.cardFeature}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "4px" }}>
                      splitscreen
                    </span>
                    แบ่งกลุ่มตามจำนวนคนต่อไฟล์ได้
                  </div>
                  <span className={`${styles.checkIndicator} material-symbols-outlined`}>
                    check_circle
                  </span>
                </div>
              </div>

              <div className={styles.stepNav}>
                <div></div>
                <button className={styles.navBtnNext} onClick={goNext}>
                  ถัดไป{" "}
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", marginLeft: "6px" }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className={styles.stepHeader}>
                <h1 className={styles.pageTitle}>ตั้งค่าระบบ</h1>
                <p className={styles.pageSubtitle}>
                  กำหนดโดเมนอีเมลนักเรียนและตำแหน่งของหน่วยจัดระเบียบ (Org Unit Path)
                  สำหรับการแบ่งระดับชั้นเรียน
                </p>
              </div>

              <div style={{ marginBottom: "24px", display: "flex", justifyContent: "center" }}>
                <span
                  className={`${styles.statusBadge} ${
                    exportType === "csv"
                      ? styles.badgeSuccess
                      : exportType === "addmultiuser"
                      ? styles.badgeInfo
                      : styles.badgeProcessing
                  }`}
                >
                  รูปแบบที่เลือก: {exportType === "csv" ? "CSV (Google Workspace)" : exportType === "addmultiuser" ? "Excel (Multi-User)" : "Excel (Report)"}
                </span>
              </div>

              <div className={styles.formCard}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="customDomain">
                      โดเมนอีเมลนักเรียน (@)
                    </label>
                    <div className={styles.inputWithIcon}>
                      <span className={`${styles.inputIcon} material-symbols-outlined`}>
                        alternate_email
                      </span>
                      <input
                        id="customDomain"
                        type="text"
                        className={`${styles.inputField} ${styles.inputFieldWithIcon} ${
                          !customDomain.trim() ? styles.inputError : ""
                        }`}
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value.trim())}
                        placeholder="เช่น minburi.ac.th"
                        disabled={isProcessing}
                      />
                    </div>
                    {!customDomain.trim() && (
                      <span className={styles.validationError}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px", marginRight: "4px" }}>
                          error
                        </span>
                        กรุณากรอกโดเมนอีเมลนักเรียน
                      </span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="batchSize">
                      จำนวนคนต่อไฟล์ (เฉพาะ CSV / Multi-User)
                    </label>
                    <div className={styles.inputWithIcon}>
                      <span className={`${styles.inputIcon} material-symbols-outlined`}>
                        layers
                      </span>
                      <input
                        id="batchSize"
                        type="number"
                        className={`${styles.inputField} ${styles.inputFieldWithIcon} ${
                          exportType === "excel" ? styles.disabledInput : ""
                        }`}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        disabled={exportType === "excel" || isProcessing}
                      />
                    </div>
                    {exportType === "excel" && (
                      <span className={styles.inputCaption}>ปิดการใช้งานสำหรับรูปแบบรายงาน Excel</span>
                    )}
                  </div>
                </div>

                <div className={styles.divider}></div>

                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      <div className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={usePVC}
                          onChange={(e) => setUsePVC(e.target.checked)}
                          disabled={isProcessing}
                        />
                        <span>ระดับชั้น ปวช.</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      className={`${styles.inputField} ${!usePVC || exportType === "addmultiuser" ? styles.disabledInput : ""} ${
                        usePVC && exportType !== "addmultiuser" && !orgUnitPVC.trim() ? styles.inputError : ""
                      }`}
                      value={exportType === "addmultiuser" ? "" : orgUnitPVC}
                      onChange={(e) => setOrgUnitPVC(e.target.value)}
                      placeholder={exportType === "addmultiuser" ? "ไม่ต้องใช้ Org Unit Path สำหรับ Multi-User" : usePVC ? "เช่น /Students/ปวช" : "ไม่ได้เปิดใช้งาน"}
                      disabled={!usePVC || exportType === "addmultiuser" || isProcessing}
                    />
                    {usePVC && exportType !== "addmultiuser" && !orgUnitPVC.trim() && (
                      <span className={styles.validationError}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px", marginRight: "4px" }}>
                          error
                        </span>
                        กรุณากรอก Org Unit Path ของ ปวช.
                      </span>
                    )}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      <div className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={usePVS}
                          onChange={(e) => setUsePVS(e.target.checked)}
                          disabled={isProcessing}
                        />
                        <span>ระดับชั้น ปวส.</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      className={`${styles.inputField} ${!usePVS || exportType === "addmultiuser" ? styles.disabledInput : ""} ${
                        usePVS && exportType !== "addmultiuser" && !orgUnitPVS.trim() ? styles.inputError : ""
                      }`}
                      value={exportType === "addmultiuser" ? "" : orgUnitPVS}
                      onChange={(e) => setOrgUnitPVS(e.target.value)}
                      placeholder={exportType === "addmultiuser" ? "ไม่ต้องใช้ Org Unit Path สำหรับ Multi-User" : usePVS ? "เช่น /Students/ปวส" : "ไม่ได้เปิดใช้งาน"}
                      disabled={!usePVS || exportType === "addmultiuser" || isProcessing}
                    />
                    {usePVS && exportType !== "addmultiuser" && !orgUnitPVS.trim() && (
                      <span className={styles.validationError}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px", marginRight: "4px" }}>
                          error
                        </span>
                        กรุณากรอก Org Unit Path ของ ปวส.
                      </span>
                    )}
                  </div>
                </div>

                {!usePVC && !usePVS && (
                  <div className={styles.validationError} style={{ marginTop: "12px" }}>
                    <span className="material-symbols-outlined" style={{ marginRight: "4px" }}>
                      error
                    </span>
                    กรุณาเลือกอย่างน้อยหนึ่งระดับชั้น (ปวช. หรือ ปวส.)
                  </div>
                )}

                <div className={styles.divider}></div>

                <div className={styles.emailPreview}>
                  <div className={styles.emailPreviewIcon}>
                    <span className="material-symbols-outlined">alternate_email</span>
                  </div>
                  <div>
                    <div className={styles.emailPreviewLabel}>ตัวอย่างรูปแบบอีเมลนักเรียน</div>
                    <div className={styles.emailPreviewValue}>
                      12345@{customDomain || "..."}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.stepNav}>
                <button className={styles.navBtnBack} onClick={goBack}>
                  ย้อนกลับ
                </button>
                <button className={styles.navBtnNext} onClick={goNext} disabled={!isFormValid()}>
                  ถัดไป{" "}
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", marginLeft: "6px" }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className={styles.stepHeader}>
                <h1 className={styles.pageTitle}>อัปโหลดไฟล์และประมวลผล</h1>
                <p className={styles.pageSubtitle}>
                  เลือกหรือลากไฟล์ Excel ตารางเรียน (.xlsx) เพื่อเตรียมวิเคราะห์ข้อมูลบัญชีอีเมล
                </p>
              </div>

              {/* Readiness checklist bar */}
              <div className={styles.readinessBar}>
                <div className={styles.readinessItem}>
                  <span className="material-symbols-outlined">check_circle</span>
                  รูปแบบ: {exportType === "csv" ? "CSV" : exportType === "addmultiuser" ? "Multi-User" : "Excel"}
                </div>
                <div className={styles.readinessItem}>
                  <span className="material-symbols-outlined">check_circle</span>
                  โดเมน: {customDomain}
                </div>
                {exportType !== "addmultiuser" && usePVC && (
                  <div className={styles.readinessItem}>
                    <span className="material-symbols-outlined">check_circle</span>
                    ปวช: {orgUnitPVC}
                  </div>
                )}
                {exportType !== "addmultiuser" && usePVS && (
                  <div className={styles.readinessItem}>
                    <span className="material-symbols-outlined">check_circle</span>
                    ปวส: {orgUnitPVS}
                  </div>
                )}
              </div>

              {/* Dropzone */}
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <div className={styles.dropZoneIcon}>
                  <span className="material-symbols-outlined">cloud_upload</span>
                </div>
                <h3 className={styles.dropZoneTitle}>ลากและวางไฟล์ตารางเรียน Excel</h3>
                <p className={styles.dropZoneText}>
                  รองรับไฟล์นามสกุล .xlsx เท่านั้น (เลือกอัปโหลดพร้อมกันได้หลายไฟล์)
                </p>
                <input
                  type="file"
                  multiple
                  accept=".xlsx"
                  className={styles.hiddenInput}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </div>

              {/* File list queue */}
              {files.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div className={styles.fileQueueHeader}>
                    <h3 className={styles.fileQueueTitle}>รายการไฟล์ที่พร้อมแปลง ({files.length})</h3>
                    <button className={styles.clearAllBtn} onClick={() => setFiles([])} disabled={isProcessing}>
                      ล้างทั้งหมด
                    </button>
                  </div>

                  <div>
                    {files.map((f, idx) => {
                      let badgeClass = styles.badgePending;
                      let badgeText = "รอดำเนินการ";
                      let showSpinner = false;

                      if (f.status === "processing") {
                        badgeClass = styles.badgeProcessing;
                        badgeText = "กำลังอ่านไฟล์...";
                        showSpinner = true;
                      } else if (f.status === "success") {
                        badgeClass = styles.badgeSuccess;
                        badgeText = `สำเร็จ (พบ ${f.studentCount} คน)`;
                      } else if (f.status === "error") {
                        badgeClass = styles.badgeError;
                        badgeText = f.error || "ข้อผิดพลาด";
                      }

                      return (
                        <div className={styles.fileItem} key={idx}>
                          <div className={styles.fileItemInfo}>
                            <span className={`${styles.fileItemIcon} material-symbols-outlined`}>
                              description
                            </span>
                            <div>
                              <div className={styles.fileName}>{f.name}</div>
                              <span className={`${styles.statusBadge} ${badgeClass}`}>
                                {showSpinner && (
                                  <span
                                    className={`${styles.spinnerIcon} material-symbols-outlined`}
                                    style={{ fontSize: "14px", marginRight: "4px" }}
                                  >
                                    sync
                                  </span>
                                )}
                                {badgeText}
                              </span>
                            </div>
                          </div>

                          <button
                            className={styles.removeBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            disabled={isProcessing}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.errorBanner}>
                  <span className="material-symbols-outlined">error</span>
                  <div>{error}</div>
                </div>
              )}
              {successMsg && (
                <div className={styles.successBanner}>
                  <span className="material-symbols-outlined">check_circle</span>
                  <div>{successMsg}</div>
                </div>
              )}

              <button
                className={`${styles.ctaButton} ${isProcessing ? styles.ctaButtonProcessing : ""}`}
                onClick={handleProcess}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? (
                  <>
                    <span className={`${styles.spinnerIcon} material-symbols-outlined`}>sync</span>
                    กำลังประมวลผลข้อมูล...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">download</span>
                    ประมวลผลและดาวน์โหลด (.zip)
                  </>
                )}
              </button>

              <div className={styles.stepNav}>
                <button className={styles.navBtnBack} onClick={goBack} disabled={isProcessing}>
                  ย้อนกลับ
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <div className={styles.successHeader}>
                <div className={styles.successIcon}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "48px", color: "var(--secondary)" }}
                  >
                    check
                  </span>
                </div>
                <h1 className={styles.successTitle}>ประมวลผลข้อมูลสำเร็จ!</h1>
                <p className={styles.successSubtitle}>
                  ระบบแปลงรายชื่อและดาวน์โหลดไฟล์บีบอัด .zip ลงเครื่องคอมพิวเตอร์ของคุณเรียบร้อยแล้ว
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "16px", margin: "24px 0" }}>
                <button className={styles.redownloadBtn} onClick={handleProcess} disabled={isProcessing}>
                  <span className="material-symbols-outlined" style={{ marginRight: "4px" }}>
                    download_done
                  </span>
                  ดาวน์โหลดอีกครั้ง (.zip)
                </button>
              </div>

              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.statCardTotal}`}>
                  <span className={`${styles.statCardBgIcon} material-symbols-outlined`}>group</span>
                  <div className={`${styles.statValue} ${styles.statValueTotal}`}>
                    {parsedData?.summary?.total || 0}
                  </div>
                  <div className={styles.statLabel}>นักเรียนที่นำเข้าทั้งหมด (คน)</div>
                </div>

                <div className={`${styles.statCard} ${styles.statCardPvc}`}>
                  <span className={`${styles.statCardBgIcon} material-symbols-outlined`}>school</span>
                  <div className={`${styles.statValue} ${styles.statValuePvc}`}>
                    {parsedData?.summary?.pvcCount || 0}
                  </div>
                  <div className={styles.statLabel}>ระดับชั้น ปวช. (คน)</div>
                </div>

                <div className={`${styles.statCard} ${styles.statCardPvs}`}>
                  <span className={`${styles.statCardBgIcon} material-symbols-outlined`}>
                    workspace_premium
                  </span>
                  <div className={`${styles.statValue} ${styles.statValuePvs}`}>
                    {parsedData?.summary?.pvsCount || 0}
                  </div>
                  <div className={styles.statLabel}>ระดับชั้น ปวส. (คน)</div>
                </div>
              </div>

              {/* Preview tables (Dynamic Columns) */}
              {parsedData?.preview?.pvc?.length > 0 && (
                <div className={styles.tableSection} style={{ marginBottom: "24px" }}>
                  <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>ตัวอย่างตารางข้อมูล ปวช. (10 คนแรก)</h3>
                    <span className={`${styles.tableBadge} ${styles.tableBadgePvc}`}>
                      ปวช. ({parsedData.summary.pvcCount} คน)
                    </span>
                  </div>

                  <div className={styles.tableWrapper}>
                    {exportType === "addmultiuser" ? (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th>อีเมลล์</th>
                            <th>username</th>
                            <th>passwprd</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvc.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>{student.citizenId || student.studentId}</td>
                              <td>{student.citizenId || student.studentId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : exportType === "csv" ? (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email Address</th>
                            <th>Password</th>
                            <th>Org Unit Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvc.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>{student.password}</td>
                              <td>
                                <code>{orgUnitPVC}</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>รหัสประจำตัว</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th>อีเมล</th>
                            <th>Org Unit Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvc.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.password}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>
                                <code>{orgUnitPVC}</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {parsedData.summary.pvcCount > 10 && (
                    <p className={styles.remainingText}>
                      ... และมีข้อมูลนักเรียนระดับ ปวช. อีก {parsedData.summary.pvcCount - 10}{" "}
                      คนที่ไม่ได้แสดงในตารางตัวอย่าง
                    </p>
                  )}
                </div>
              )}

              {parsedData?.preview?.pvs?.length > 0 && (
                <div className={styles.tableSection} style={{ marginBottom: "24px" }}>
                  <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>ตัวอย่างตารางข้อมูล ปวส. (10 คนแรก)</h3>
                    <span className={`${styles.tableBadge} ${styles.tableBadgePvs}`}>
                      ปวส. ({parsedData.summary.pvsCount} คน)
                    </span>
                  </div>

                  <div className={styles.tableWrapper}>
                    {exportType === "addmultiuser" ? (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th>อีเมลล์</th>
                            <th>username</th>
                            <th>passwprd</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvs.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>{student.citizenId || student.studentId}</td>
                              <td>{student.citizenId || student.studentId}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : exportType === "csv" ? (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email Address</th>
                            <th>Password</th>
                            <th>Org Unit Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvs.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>{student.password}</td>
                              <td>
                                <code>{orgUnitPVS}</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>รหัสประจำตัว</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th>อีเมล</th>
                            <th>Org Unit Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.preview.pvs.map((student, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{student.password}</td>
                              <td>{student.firstName}</td>
                              <td>{student.lastName}</td>
                              <td>{student.email}</td>
                              <td>
                                <code>{orgUnitPVS}</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {parsedData.summary.pvsCount > 10 && (
                    <p className={styles.remainingText}>
                      ... และมีข้อมูลนักเรียนระดับ ปวส. อีก {parsedData.summary.pvsCount - 10}{" "}
                      คนที่ไม่ได้แสดงในตารางตัวอย่าง
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
                <button
                  className={styles.navBtnBack}
                  onClick={() => {
                    setFiles([]);
                    setParsedData(null);
                    setSuccessMsg(null);
                    setError(null);
                    setCurrentStep(1);
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "18px", marginRight: "6px" }}
                  >
                    refresh
                  </span>
                  แปลงไฟล์ใหม่ / เริ่มต้นใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerCopyright}>
            © {new Date().getFullYear()} Student Email Account System.
          </p>
          <ul className={styles.footerLinks}>
            <li>
              <a
                href="#usage-guide"
                className={styles.footerLink}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveModal("guide");
                }}
              >
                คู่มือการใช้งาน
              </a>
            </li>
            <li>
              <a
                href="#privacy-policy"
                className={styles.footerLink}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveModal("privacy");
                }}
              >
                นโยบายความเป็นส่วนตัว
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className={styles.footerLink}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveModal("contact");
                }}
              >
                ติดต่อผู้พัฒนา
              </a>
            </li>
          </ul>
        </div>
      </footer>

      {/* Modals */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {activeModal === "guide" && "📖 คู่มือการใช้งาน"}
                {activeModal === "privacy" && "🔒 นโยบายความเป็นส่วนตัว"}
                {activeModal === "contact" && "✉️ ติดต่อผู้พัฒนา"}
              </h2>
              <button
                className={styles.closeModalBtn}
                onClick={() => setActiveModal(null)}
                aria-label="ปิดป๊อปอัป"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {activeModal === "guide" && (
                <div className={styles.modalScroll}>
                  <h3>ข้อกำหนดของไฟล์ Excel (.xlsx) ที่รองรับ</h3>
                  <ul className={styles.modalList}>
                    <li>
                      เป็นไฟล์ตารางเรียน/รายชื่อนักเรียนที่ดาวน์โหลดมาจากระบบ <strong>ศธ.02</strong>
                    </li>
                    <li>
                      โครงสร้างตารางข้อมูลรายชื่อนักเรียนจะ<strong>เริ่มต้นที่แถวที่ 9 เป็นต้นไป</strong>
                    </li>
                    <li>
                      <strong>คอลัมน์สำคัญที่ระบบดึงข้อมูล:</strong>
                      <ul className={styles.modalSubList}>
                        <li>
                          คอลัมน์ C (คอลัมน์ที่ 3) - รหัสประจำตัวนักเรียน (ใช้สร้างรหัสผ่านเริ่มต้นและส่วนหนึ่งของอีเมล)
                        </li>
                        <li>
                          คอลัมน์ D (คอลัมน์ที่ 4) - คำนำหน้า ชื่อ และนามสกุล (ใช้แยกคำนำหน้าเพื่อสกัดชื่อและนามสกุลภาษาไทย)
                        </li>
                      </ul>
                    </li>
                  </ul>

                  <h3>ขั้นตอนการทำงาน (4-Step Wizard)</h3>
                  <ol className={styles.modalOrderedList}>
                    <li>
                      <strong>ขั้นตอนที่ 1 เลือกรูปแบบการส่งออก:</strong> เลือกประเภทไฟล์ที่ต้องการระหว่าง
                      <ul className={styles.modalSubList}>
                        <li><code>CSV — Google Workspace</code> สำหรับนำเข้าผู้ใช้ใหม่ใน Google Workspace Admin Console (แบ่งกลุ่มไฟล์ย่อยอัตโนมัติ)</li>
                        <li><code>Excel — รายงาน</code> สำหรับสร้างสรุปรายงานรายชื่อผู้ใช้ที่ผ่านการแปลงข้อมูล</li>
                      </ul>
                    </li>
                    <li>
                      <strong>ขั้นตอนที่ 2 ตั้งค่าระบบ:</strong> กรอกโดเมนอีเมลของวิทยาลัย (เช่น <code>minburi.ac.th</code>),
                      จำนวนรายชื่อคนต่อไฟล์ (สำหรับ CSV), และกำหนดตำแหน่งหน่วยจัดระเบียบ (Org Unit Path)
                      แยกตามระดับชั้นเรียน ปวช. และ ปวส. ที่เปิดใช้งาน
                    </li>
                    <li>
                      <strong>ขั้นตอนที่ 3 อัปโหลดไฟล์และประมวลผล:</strong> ลากไฟล์ <code>.xlsx</code> จากระบบ ศธ.02 
                      มาวางในกล่อง Drop Zone (สามารถอัปโหลดได้หลายไฟล์พร้อมกัน) จากนั้นกดปุ่ม <code>ประมวลผลและดาวน์โหลด (.zip)</code>
                    </li>
                    <li>
                      <strong>ขั้นตอนที่ 4 ผลลัพธ์การทำงาน:</strong> ระบบจะทำการดาวน์โหลดไฟล์ <code>.zip</code> 
                      ที่ประมวลผลเสร็จแล้วลงเครื่องของคุณทันที พร้อมทั้งแสดงสถิติยอดรวม และตารางตัวอย่าง (Preview) รายชื่อผู้ใช้ที่ผ่านการแปลงเรียบร้อยแล้ว
                    </li>
                  </ol>
                </div>
              )}

              {activeModal === "privacy" && (
                <div className={styles.modalScroll}>
                  <h3>นโยบายความเป็นส่วนตัวและความปลอดภัยข้อมูล</h3>
                  <p>
                    เพื่อความมั่นใจในความปลอดภัยของข้อมูลส่วนบุคคลและข้อมูลอ่อนไหวของสถานศึกษาและนักเรียน
                    ระบบนี้ได้รับการออกแบบโดยมีแนวคิด <strong>Privacy-by-Design</strong> ดังนี้:
                  </p>

                  <div className={styles.privacyHighlight}>
                    <h4>🔒 ประมวลผลบนเครื่องของคุณ 100% (Client-Side Only)</h4>
                    <p>
                      ไฟล์ Excel ที่คุณเลือก รวมถึงรายชื่อ รหัสนักเรียน
                      และข้อมูลทั้งหมดจะถูกประมวลผลภายในเบราว์เซอร์บนเครื่องคอมพิวเตอร์ของคุณเท่านั้น
                      ไม่มีกระบวนการอัปโหลดไฟล์หรือส่งผ่านข้อมูลใด ๆ ออกไปยังเซิร์ฟเวอร์ภายนอกผ่านอินเทอร์เน็ต
                    </p>
                  </div>

                  <ul className={styles.modalList}>
                    <li>
                      <strong>ไม่มีการส่งต่อข้อมูล:</strong> โค้ดของระบบเขียนด้วย React/Next.js ทำงานบน
                      Browser ของผู้ใช้ ทำให้มั่นใจได้ว่าข้อมูลจะไม่ถูกจัดเก็บหรือรวบรวมไว้ที่อื่น
                    </li>
                    <li>
                      <strong>การบันทึกข้อมูลการตั้งค่า:</strong> ระบบจะบันทึกเพียงค่ากำหนดทั่วไป เช่น
                      โดเมนอีเมล และ Org Unit Path ลงในหน่วยความจำ <code>localStorage</code>{" "}
                      ภายในคอมพิวเตอร์เครื่องนี้เท่านั้น เพื่อความสะดวกในการใช้งานครั้งต่อไป
                    </li>
                    <li>
                      <strong>สอดคล้องตามเกณฑ์ PDPA:</strong> ด้วยโครงสร้างที่ไร้ฐานข้อมูลส่วนกลาง
                      ระบบนี้จึงไม่มีความเสี่ยงด้านข้อมูลรั่วไหลหรือการเข้าถึงข้อมูลโดยไม่ได้รับอนุญาตตามกฎหมาย
                      PDPA
                    </li>
                  </ul>
                </div>
              )}

              {activeModal === "contact" && (
                <div className={styles.modalScroll}>
                  <h3>ช่องทางการติดต่อผู้พัฒนา</h3>
                  <p>
                    หากคุณพบปัญหาในการใช้งานระบบแปลงข้อมูลรายชื่อนักเรียน หรือมีข้อเสนอแนะเพิ่มเติม
                    สามารถติดต่อฝ่ายเทคโนโลยีสารสนเทศของสถานศึกษาได้ที่:
                  </p>

                  <div className={styles.contactDetails}>
                    <p>
                      <strong>หน่วยงานรับผิดชอบ:</strong> งานศูนย์ข้อมูลสารสนเทศ / แผนกเทคโนโลยีธุรกิจดิจิทัล
                    </p>
                    <p>
                      <strong>อีเมลติดต่อ:</strong>{" "}
                      <a href="mailto:teerapatkemtis@gmail.com" className={styles.contactLink}>
                        teerapatkemtis@gmail.com
                      </a>
                    </p>
                    <p>
                      <strong>เวลาทำการ:</strong> จันทร์ - ศุกร์ | เวลา 08:30 น. - 16:30 น.
                    </p>
                  </div>

                  <div className={styles.alertCard}>
                    <h5>💡 คำแนะนำการแจ้งปัญหาการใช้งาน:</h5>
                    <p>เพื่อความรวดเร็วในการแก้ปัญหาการแปลงไฟล์ กรุณาแนบรายละเอียดต่อไปนี้:</p>
                    <ol className={styles.modalOrderedList}>
                      <li>
                        ภาพหน้าจอหรือข้อความแจ้งเตือนข้อผิดพลาด (Error Message) ที่แสดงบนหน้าเว็บ
                      </li>
                      <li>
                        ตัวอย่างโครงสร้างไฟล์ Excel ที่พบปัญหา
                        (สามารถลบข้อมูลรายชื่อนักเรียนออกก่อนส่ง เพื่อความปลอดภัย)
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
