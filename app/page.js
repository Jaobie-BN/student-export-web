'use client';

import { useState, useRef } from 'react';
import { saveAs } from 'file-saver';
import { processFiles } from '../utils/parser';
import styles from './page.module.css';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [exportType, setExportType] = useState('csv');
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx'));
      if (droppedFiles.length === 0) {
        setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น');
        return;
      }
      // Merge with existing avoiding duplicates by name
      setFiles(prev => {
        const newFiles = [...prev];
        droppedFiles.forEach(f => {
          if (!newFiles.some(existing => existing.name === f.name)) {
            newFiles.push(f);
          }
        });
        return newFiles;
      });
    }
  };

  const handleFileSelect = (e) => {
    setError(null);
    setSuccessMsg(null);
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
            newFiles.push(f);
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

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const zipBlob = await processFiles(files, exportType);
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = exportType === 'csv' 
        ? `Google_Workspace_Export_${dateStr}.zip`
        : `Student_Report_Export_${dateStr}.zip`;

      saveAs(zipBlob, fileName);
      setSuccessMsg('ประมวลผลและดาวน์โหลดไฟล์สำเร็จ!');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  return (
    <main className={styles.main}>
      <div className={styles.glassContainer}>
        <h1 className={styles.title}>
          <span className={styles.gradientText}>Student</span> Data Export
        </h1>
        <p className={styles.subtitle}>ระบบแปลงไฟล์รายชื่อนักเรียนอัตโนมัติ (ทำงานบนเบราว์เซอร์ 100%)</p>

        <div 
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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
          />
        </div>

        {files.length > 0 && (
          <div className={styles.fileList}>
            <h3>ไฟล์ที่เลือก ({files.length} ไฟล์):</h3>
            <ul>
              {files.map((file, idx) => (
                <li key={idx}>
                  <div className={styles.fileInfo}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span className={styles.fileName}>{file.name}</span>
                  </div>
                  <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
      </div>
    </main>
  );
}
