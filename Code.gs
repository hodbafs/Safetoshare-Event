/**
 * ==========================================================================
 * SAFE TO SHARE : ปลอดภัยที่จะเล่า — GOOGLE APPS SCRIPT BACKEND (Code.gs)
 * ==========================================================================
 * ลิงก์ Google Sheet: https://docs.google.com/spreadsheets/d/13TcibOSGW4bqPnbcJeUS2AK-5VZtcld2z0T77vtCe6c/edit
 * แผ่นงาน (Sheet): "Name List"
 * คอลัมน์: A=No., B=Name, C=Surname, D=Email, E=Seat No.
 */

const SHEET_ID = '13TcibOSGW4bqPnbcJeUS2AK-5VZtcld2z0T77vtCe6c';
const SHEET_NAME = 'Name List';

/**
 * จัดการ CORS Headers เพื่อให้หน้าเว็บเรียกใช้ได้จากทุกที่
 */
function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * GET Request: ดึงข้อมูลรายชื่อพนักงานทั้งหมดพร้อมสถานะที่นั่งที่ถูกจองแล้ว
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    const employees = [];
    const bookedSeats = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const no = row[0];
      const name = row[1];
      const surname = row[2];
      const email = row[3];
      const seatNo = row[4] ? String(row[4]).trim() : '';

      if (name) {
        const fullName = `${name} ${surname}`.trim();
        const empItem = {
          no: no,
          name: name,
          surname: surname,
          fullName: fullName,
          email: email,
          seatNo: seatNo
        };
        employees.push(empItem);

        if (seatNo) {
          bookedSeats[seatNo] = {
            fullName: fullName,
            email: email,
            rowIndex: i + 1
          };
        }
      }
    }

    return createCorsResponse({
      status: 'success',
      employees: employees,
      bookedSeats: bookedSeats
    });

  } catch (error) {
    return createCorsResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * POST Request: จองที่นั่ง หรือ ปลดล็อค/ยกเลิกการจอง (โดย Admin)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return createCorsResponse({
      status: 'error',
      message: 'มีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้งในอีกสักครู่'
    });
  }

  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      requestData = e.parameter;
    }

    const { action, seatNo, email, name } = requestData;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    // ACTION: ยกเลิกการจองที่นั่ง (ADMIN CANCEL / RELEASE SEAT)
    if (action === 'cancel') {
      if (!seatNo && !email) {
        return createCorsResponse({
          status: 'error',
          message: 'กรุณาระบุที่นั่งหรือพนักงานที่ต้องการยกเลิก'
        });
      }

      let canceled = false;
      for (let i = 1; i < data.length; i++) {
        const existingSeat = data[i][4] ? String(data[i][4]).trim() : '';
        const empEmail = String(data[i][3]).trim().toLowerCase();

        if ((seatNo && existingSeat.toLowerCase() === String(seatNo).trim().toLowerCase()) ||
            (email && empEmail === String(email).trim().toLowerCase())) {
          sheet.getRange(i + 1, 5).setValue(''); // ลบค่าใน Column E
          canceled = true;
        }
      }

      if (canceled) {
        return createCorsResponse({
          status: 'success',
          message: `ปลดล็อค / ยกเลิกการจองที่นั่ง ${seatNo || ''} เรียบร้อยแล้ว`
        });
      } else {
        return createCorsResponse({
          status: 'error',
          message: 'ไม่พบข้อมูลการจองที่ต้องการยกเลิก'
        });
      }
    }

    // ACTION: จองที่นั่งใหม่ (NORMAL BOOKING)
    if (!seatNo || (!email && !name)) {
      return createCorsResponse({
        status: 'error',
        message: 'ข้อมูลไม่ครบถ้วน กรุณาระบุที่นั่ง และพนักงานที่ต้องการจอง'
      });
    }

    // 1. ตรวจสอบก่อนว่าที่นั่งนี้ถูกจองไปแล้วหรือยัง
    for (let i = 1; i < data.length; i++) {
      const existingSeat = data[i][4] ? String(data[i][4]).trim() : '';
      if (existingSeat.toLowerCase() === String(seatNo).trim().toLowerCase()) {
        const existingBooker = `${data[i][1]} ${data[i][2]}`.trim();
        return createCorsResponse({
          status: 'error',
          message: `ที่นั่ง ${seatNo} ถูกจองไปแล้วโดย ${existingBooker}`
        });
      }
    }

    // 2. ค้นหาแถวของพนักงานตาม Email หรือ Full Name เพื่อบันทึก Column E
    let updatedRow = -1;
    for (let i = 1; i < data.length; i++) {
      const empEmail = String(data[i][3]).trim().toLowerCase();
      const empFullName = `${data[i][1]} ${data[i][2]}`.trim().toLowerCase();
      
      const reqEmail = String(email || '').trim().toLowerCase();
      const reqName = String(name || '').trim().toLowerCase();

      if ((reqEmail && empEmail === reqEmail) || (reqName && empFullName.includes(reqName))) {
        sheet.getRange(i + 1, 5).setValue(seatNo.trim());
        updatedRow = i + 1;
        break;
      }
    }

    if (updatedRow === -1) {
      return createCorsResponse({
        status: 'error',
        message: 'ไม่พบรายชื่อพนักงานนี้ในระบบ กรุณาเลือกรายชื่อจากรายการที่กำหนด'
      });
    }

    return createCorsResponse({
      status: 'success',
      message: `จองที่นั่ง ${seatNo} สำเร็จเรียบร้อยแล้ว!`,
      seatNo: seatNo
    });

  } catch (error) {
    return createCorsResponse({
      status: 'error',
      message: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}
