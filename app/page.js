'use client';

import { useState, useRef } from 'react';
import { saveAs } from 'file-saver';
import { processFiles } from '../utils/parser';
import styles from './page.module.css';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [exportType, setExportType] = useState('csv');
  const [customDomain, setCustomDomain] = useState('minburi.ac.th');
  const [batchSize, setBatchSize] = useState(100);
  const [orgUnitPVC, setOrgUnitPVC] = useState('');
  const [orgUnitPVS, setOrgUnitPVS] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

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
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx'));
      if (droppedFiles.length === 0) {
        setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น');
        return;
      }
      setFiles(prev => {
        const newFiles = [...prev];
        droppedFiles.forEach(f => {
          if (!newFiles.some(existing => existing.name === f.name)) {
            newFiles.push({
              file: f,
              name: f.name,
              status: 'pending',
              studentCount: null,
              error: null
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
      const selectedFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.xlsx'));
      if (selectedFiles.length === 0) {
        setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น');
        return;
      }
      setFiles(prev => {
        const newFiles = [...prev];
        selectedFiles.forEach(f => {
          if (!newFiles.some(existing => existing.name === f.name)) {
            newFiles.push({
              file: f,
              name: f.name,
              status: 'pending',
              studentCount: null,
              error: null
            });
          }
        });
        return newFiles;
      });
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('กรุณาเลือกไฟล์ก่อนทำการประมวลผล');
      return;
    }

    if (!orgUnitPVC.trim()) {
      setError('กรุณากรอก Org Unit Path สำหรับ ปวช.');
      return;
    }

    if (!orgUnitPVS.trim()) {
      setError('กรุณากรอก Org Unit Path สำหรับ ปวส.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    setParsedData(null);

    try {
      const rawFiles = files.map(f => f.file);

      // Callback to update file progress in real-time
      const onProgress = (fileName, status, studentCount, errMsg = null) => {
        setFiles(prev => prev.map(f => {
          if (f.name === fileName) {
            return {
              ...f,
              status,
              studentCount: status === 'success' ? studentCount : f.studentCount,
              error: errMsg
            };
          }
          return f;
        }));
      };

      const result = await processFiles(
        rawFiles,
        exportType,
        customDomain,
        batchSize,
        orgUnitPVC.trim(),
        orgUnitPVS.trim(),
        onProgress
      );
      
      setParsedData({
        summary: result.summary,
        preview: result.preview
      });

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = exportType === 'csv' 
        ? `Google_Workspace_Export_${dateStr}.zip`
        : `Student_Report_Export_${dateStr}.zip`;

      saveAs(result.zipBlob, fileName);
      setSuccessMsg('ประมวลผลและดาวน์โหลดไฟล์สำเร็จ!');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    setParsedData(null);
    setSuccessMsg(null);
  };

  return (
    <main className={styles.main}>
      <div className={styles.glassContainer}>
        <h1 className={styles.title}>
          <span className={styles.gradientText}>Student</span> Data Export
        </h1>
        <p className={styles.subtitle}>ระบบแปลงไฟล์รายชื่อนักเรียนอัตโนมัติ (ทำงานบนเบราว์เซอร์ 100%)</p>

        {/* Settings Panel */}
        <div className={styles.settingsCard}>
          <h3 className={styles.settingsTitle}>ตั้งค่าระบบ</h3>
          <div className={styles.settingsGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="customDomain">โดเมนอีเมลนักเรียน (@)</label>
              <input
                id="customDomain"
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.trim())}
                placeholder="เช่น minburi.ac.th"
                disabled={isProcessing}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="batchSize" className={exportType === 'excel' ? styles.disabledLabel : ''}>
                จำนวนคนต่อไฟล์ CSV (เฉพาะ CSV)
              </label>
              <input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                disabled={exportType === 'excel' || isProcessing}
                className={exportType === 'excel' ? styles.disabledInput : ''}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="orgUnitPVC">Org Unit Path สำหรับ ปวช.</label>
              <input
                id="orgUnitPVC"
                type="text"
                value={orgUnitPVC}
                onChange={(e) => setOrgUnitPVC(e.target.value)}
                placeholder="เช่น /Students/ปวช/2568"
                disabled={isProcessing}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="orgUnitPVS">Org Unit Path สำหรับ ปวส.</label>
              <input
                id="orgUnitPVS"
                type="text"
                value={orgUnitPVS}
                onChange={(e) => setOrgUnitPVS(e.target.value)}
                placeholder="เช่น /Students/ปวส/2568"
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div 
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          style={{ cursor: isProcessing ? 'not-allowed' : 'pointer' }}
        >
          <div className={styles.uploadIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p>ลากไฟล์ Excel (.xlsx) มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
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

        {/* File List */}
        {files.length > 0 && (
          <div className={styles.fileList}>
            <h3>ไฟล์ที่เลือก ({files.length} ไฟล์):</h3>
            <ul>
              {files.map((f, idx) => {
                let badgeClass = styles.badgePending;
                let badgeText = 'รอดำเนินการ';
                if (f.status === 'processing') {
                  badgeClass = styles.badgeProcessing;
                  badgeText = 'กำลังอ่านไฟล์...';
                } else if (f.status === 'success') {
                  badgeClass = styles.badgeSuccess;
                  badgeText = `สำเร็จ (พบ ${f.studentCount} คน)`;
                } else if (f.status === 'error') {
                  badgeClass = styles.badgeError;
                  badgeText = f.error || 'ข้อผิดพลาด';
                }

                return (
                  <li key={idx}>
                    <div className={styles.fileInfo}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span className={styles.fileName}>{f.name}</span>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>{badgeText}</span>
                    </div>
                    <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeFile(idx); }} disabled={isProcessing}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Options */}
        <div className={styles.optionsContainer}>
          <h3>รูปแบบการส่งออก:</h3>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioLabel} ${exportType === 'csv' ? styles.active : ''}`}>
              <input 
                type="radio" 
                name="exportType" 
                value="csv" 
                checked={exportType === 'csv'} 
                onChange={() => setExportType('csv')}
                disabled={isProcessing}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>CSV (Google Workspace)</span>
                <span className={styles.radioDesc}>สำหรับนำเข้าอีเมลนักเรียนใหม่</span>
              </div>
            </label>
            <label className={`${styles.radioLabel} ${exportType === 'excel' ? styles.active : ''}`}>
              <input 
                type="radio" 
                name="exportType" 
                value="excel" 
                checked={exportType === 'excel'} 
                onChange={() => setExportType('excel')}
                disabled={isProcessing}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>Excel (Report)</span>
                <span className={styles.radioDesc}>สำหรับพิมพ์รายงานทั่วไป</span>
              </div>
            </label>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {successMsg && <div className={styles.successMessage}>{successMsg}</div>}

        <button 
          className={`${styles.processBtn} ${isProcessing ? styles.processing : ''}`} 
          onClick={handleProcess}
          disabled={isProcessing || files.length === 0}
        >
          {isProcessing ? (
            <>
              <span className={styles.spinner}></span>
              กำลังประมวลผล...
            </>
          ) : (
            'ประมวลผลและดาวน์โหลด (.zip)'
          )}
        </button>

        {/* Results and Previews */}
        {parsedData && (
          <div className={styles.resultsSection}>
            <div className={styles.divider}></div>
            <h2 className={styles.resultsTitle}>ผลการประมวลผลข้อมูล</h2>
            
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{parsedData.summary.total}</span>
                <span className={styles.statLabel}>นักเรียนทั้งหมด (คน)</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{parsedData.summary.pvcCount}</span>
                <span className={styles.statLabel}>ระดับชั้น ปวช. (คน)</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{parsedData.summary.pvsCount}</span>
                <span className={styles.statLabel}>ระดับชั้น ปวส. (คน)</span>
              </div>
            </div>

            {/* Preview Groups */}
            <div className={styles.previewsContainer}>
              {parsedData.summary.pvcCount > 0 && (
                <div className={styles.previewGroup}>
                  <h3 className={styles.previewGroupTitle}>ตัวอย่างตารางข้อมูล ปวช. (10 คนแรก)</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>#</th>
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
                            <td>{student.firstName}</td>
                            <td>{student.lastName}</td>
                            <td className={styles.emailCell}>{student.email}</td>
                            <td><code>{student.orgUnitPath}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.summary.pvcCount > 10 && (
                    <p className={styles.remainingText}>
                      ... และมีข้อมูลอีก {parsedData.summary.pvcCount - 10} คนที่ซ่อนอยู่
                    </p>
                  )}
                </div>
              )}

              {parsedData.summary.pvsCount > 0 && (
                <div className={styles.previewGroup}>
                  <h3 className={styles.previewGroupTitle}>ตัวอย่างตารางข้อมูล ปวส. (10 คนแรก)</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>#</th>
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
                            <td>{student.firstName}</td>
                            <td>{student.lastName}</td>
                            <td className={styles.emailCell}>{student.email}</td>
                            <td><code>{student.orgUnitPath}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.summary.pvsCount > 10 && (
                    <p className={styles.remainingText}>
                      ... และมีข้อมูลอีก {parsedData.summary.pvsCount - 10} คนที่ซ่อนอยู่
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
