import * as xlsx from 'xlsx';
import JSZip from 'jszip';

// ฟังก์ชันวิเคราะห์ชื่อ-สกุล
export function parseStudentName(columns) {
    let rawName = columns[3] ? String(columns[3]).trim() : '';
    let rawLastName = '';
    const studentTypes = ['ปกติ', 'ทวิภาคี', 'ภาคสมทบ', 'สมทบ', 'กำลังศึกษา'];

    if (!rawName.includes(' ') && columns[4]) {
        const col4Str = String(columns[4]).trim();
        if (!studentTypes.some(type => col4Str.includes(type))) {
            rawLastName = col4Str;
        }
    }

    const prefixes = [
        'เด็กชาย', 'เด็กหญิง', 'นางสาว', 'นาย', 'นาง', 
        'ด.ช.', 'ด.ญ.', 'น.ส.', 'ด.ช ', 'ด.ญ ', 'น.ส '
    ];
    for (let prefix of prefixes) {
        if (rawName.startsWith(prefix)) {
            rawName = rawName.substring(prefix.length).trim();
            break;
        }
    }

    if (rawLastName) {
        return { firstName: rawName, lastName: rawLastName };
    } else {
        const parts = rawName.split(/\s+/);
        return { 
            firstName: parts[0], 
            lastName: parts.slice(1).join(' ') 
        };
    }
}

// ฟังก์ชันประมวลผลไฟล์ Excel (รับ File object)
export async function processFiles(files, exportType) {
    let studentsPVC = [];
    let studentsPVS = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.endsWith('.xlsx') || file.name.includes('~$')) continue;

        const data = await file.arrayBuffer();
        const workbook = xlsx.read(data, { type: 'array' });

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            
            for (let j = 8; j < rows.length; j++) {
                const columns = rows[j];
                if (!columns || columns.length === 0) continue;

                const studentId = columns[2] ? String(columns[2]).trim() : '';
                
                if (studentId === 'รหัสประจำตัว' || !studentId || isNaN(studentId)) continue;

                const { firstName, lastName } = parseStudentName(columns);
                const email = `${studentId}@minburi.ac.th`;

                let level = 'ปวช'; 
                if (studentId.charAt(2) === '3' || sheetName.includes('ปวส') || file.name.includes('ปวส')) {
                    level = 'ปวส';
                } else if (studentId.charAt(2) === '2' || sheetName.includes('ปวช') || file.name.includes('ปวช')) {
                    level = 'ปวช';
                }

                let yearCode = studentId.substring(0, 2);
                let yearBE = isNaN(yearCode) ? '2569' : '25' + yearCode;

                const orgUnitPath = `/Students/${level}/${yearBE}`;

                const studentData = {
                    firstName,
                    lastName,
                    email,
                    password: studentId,
                    orgUnitPath
                };
                
                if (level === 'ปวส') {
                    studentsPVS.push(studentData);
                } else {
                    studentsPVC.push(studentData);
                }
            }
        });
    }

    const zip = new JSZip();

    if (exportType === 'csv') {
        const batchSize = 100;
        const BOM = '\uFEFF';
        const header = "First Name [Required],Last Name [Required],Email Address [Required],Password [Required],Org Unit Path [Required]\n";

        const createBatchCSVs = (students, levelName) => {
            for (let i = 0; i < students.length; i += batchSize) {
                const batch = students.slice(i, i + batchSize);
                let csvContent = header;

                batch.forEach(s => {
                    csvContent += `"${s.firstName}","${s.lastName}","${s.email}","${s.password}","${s.orgUnitPath}"\n`;
                });

                const batchNumber = Math.floor(i / batchSize) + 1;
                zip.file(`Google_Workspace_${levelName}_Batch_${batchNumber}.csv`, BOM + csvContent);
            }
        };

        if (studentsPVC.length > 0) createBatchCSVs(studentsPVC, 'ปวช');
        if (studentsPVS.length > 0) createBatchCSVs(studentsPVS, 'ปวส');

    } else if (exportType === 'excel') {
        const createExcelFile = (students, levelName) => {
            if (students.length === 0) return;
            
            const formattedData = students.map(s => ({
                "First name": s.firstName,
                "Last name": s.lastName,
                "Email address": s.email,
                "Password": s.password,
                "Org Unit Path": s.orgUnitPath
            }));

            const worksheet = xlsx.utils.json_to_sheet(formattedData);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, `รายชื่อ_${levelName}`);
            
            const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
            zip.file(`Student_Report_${levelName}.xlsx`, excelBuffer);
        };

        if (studentsPVC.length > 0) createExcelFile(studentsPVC, 'ปวช');
        if (studentsPVS.length > 0) createExcelFile(studentsPVS, 'ปวส');
    }

    if (Object.keys(zip.files).length === 0) {
        throw new Error("ไม่พบข้อมูลนักเรียนที่ถูกต้องในไฟล์ที่อัปโหลด");
    }

    return await zip.generateAsync({ type: 'blob' });
}
