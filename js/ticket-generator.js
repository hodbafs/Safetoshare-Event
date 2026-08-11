/* ==========================================================================
   SAFE TO SHARE : ปลอดภัยที่จะเล่า (น้องพิงใจ) — TICKET GENERATOR & REAL-TIME SEAT BOOKING
   ========================================================================== */

/**
 * 🔗 Google Apps Script Web App Deployment URL (Defined in index.html)
 */

document.addEventListener('DOMContentLoaded', () => {

  // State Management
  let selectedSeat = null;
  let selectedMood = 'ผ่อนคลาย สบายใจ';
  let selectedEmoji = '💚';
  let bookedSeats = {};
  let employeeList = [];
  let pollingTimer = null;
  let isAdminMode = false;

  // DOM Elements
  const modalStepSeat = document.getElementById('modal-step-seat');
  const modalStepForm = document.getElementById('modal-step-form');
  const modalStepTicket = document.getElementById('modal-step-ticket');

  const mainSeatsGrid = document.getElementById('main-seats-grid');
  const displaySelectedSeat = document.getElementById('display-selected-seat');
  const formSeatBadge = document.getElementById('form-seat-badge');
  const btnGotoForm = document.getElementById('btn-goto-form');
  const btnBackToSeat = document.getElementById('btn-back-to-seat');
  const btnToggleAdmin = document.getElementById('btn-toggle-admin');

  const userEmployeeSelect = document.getElementById('user-employee-select');
  const inputName = document.getElementById('user-name');
  const inputDept = document.getElementById('user-dept');
  const moodButtons = document.querySelectorAll('.mood-btn');
  const btnGenerateTicket = document.getElementById('btn-generate-ticket');

  const displayName = document.getElementById('ticket-display-name');
  const displayDept = document.getElementById('ticket-display-dept');
  const displayMood = document.getElementById('ticket-display-mood');
  const displaySeat = document.getElementById('ticket-display-seat');
  const ticketSerialNo = document.getElementById('ticket-serial-no');
  const qrcodeTarget = document.getElementById('qrcode-target');
  const btnDownloadTicket = document.getElementById('btn-download-ticket');

  // 1. GENERATE MAIN SEATING LAYOUT (Rows A to G: 7 Rows, 10 Seats per Row)
  const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  function initSeatMap() {
    if (!mainSeatsGrid) return;
    mainSeatsGrid.innerHTML = '';

    rowLabels.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.classList.add('seat-row');

      // Row Label Left
      const labelLeft = document.createElement('div');
      labelLeft.classList.add('row-label');
      labelLeft.textContent = row;
      rowDiv.appendChild(labelLeft);

      // Left 5 Seats (1-5)
      for (let i = 1; i <= 5; i++) {
        const seatNo = `${row}${i < 10 ? '0' + i : i}`;
        rowDiv.appendChild(createSeatElement(seatNo));
      }

      // Aisle Gap (สะอาด ไม่มีตัวหนังสือซ้ำ)
      const aisle = document.createElement('div');
      aisle.classList.add('aisle-gap');
      rowDiv.appendChild(aisle);

      // Right 5 Seats (6-10)
      for (let i = 6; i <= 10; i++) {
        const seatNo = `${row}${i < 10 ? '0' + i : i}`;
        rowDiv.appendChild(createSeatElement(seatNo));
      }

      // Row Label Right
      const labelRight = document.createElement('div');
      labelRight.classList.add('row-label');
      labelRight.textContent = row;
      rowDiv.appendChild(labelRight);

      mainSeatsGrid.appendChild(rowDiv);
    });

    updateSeatsUI();
  }

  function createSeatElement(seatNo) {
    const seatBox = document.createElement('div');
    seatBox.classList.add('seat-box', 'available');
    seatBox.setAttribute('data-seat', seatNo);
    seatBox.innerHTML = `<span>${seatNo}</span>`;

    seatBox.addEventListener('click', () => {
      // ADMIN MODE: ปลดล็อค / ยกเลิกการจอง
      if (isAdminMode && seatBox.classList.contains('booked')) {
        const bookerInfo = bookedSeats[seatNo];
        const bookerName = bookerInfo ? bookerInfo.fullName : 'ไม่ระบุชื่อ';
        
        const confirmCancel = confirm(`[ADMIN MODE]\nคุณต้องการยกเลิกการจองที่นั่ง ${seatNo} ของคุณ "${bookerName}" เพื่อคืนเป็นที่นั่งว่างใช่หรือไม่?`);
        if (confirmCancel) {
          cancelSeatBooking(seatNo);
        }
        return;
      }

      if (seatBox.classList.contains('booked') || seatBox.classList.contains('vip-seat')) {
        return;
      }

      document.querySelectorAll('.seat-box').forEach(sb => sb.classList.remove('selected'));
      seatBox.classList.add('selected');
      selectedSeat = seatNo;

      if (displaySelectedSeat) displaySelectedSeat.textContent = seatNo;
      if (formSeatBadge) formSeatBadge.textContent = seatNo;
      if (btnGotoForm) btnGotoForm.disabled = false;
    });

    return seatBox;
  }

  // ADMIN CANCEL / RELEASE SEAT
  async function cancelSeatBooking(seatNo) {
    try {
      const response = await fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'cancel',
          seatNo: seatNo
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert(`✅ ปลดล็อคที่นั่ง ${seatNo} เรียบร้อยแล้ว`);
        delete bookedSeats[seatNo];
        updateSeatsUI();
        fetchSeatsAndEmployees();
      } else {
        alert(`❌ ไม่สามารถปลดล็อคที่นั่งได้: ${result.message}`);
      }
    } catch (err) {
      console.error("Admin cancel error:", err);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูลไปยังเซิร์ฟเวอร์");
    }
  }

  // 2. UPDATE SEAT STATUS UI (Available / Booked / Selected)
  function updateSeatsUI() {
    if (modalStepSeat) {
      if (isAdminMode) {
        modalStepSeat.classList.add('admin-active-mode');
      } else {
        modalStepSeat.classList.remove('admin-active-mode');
      }
    }

    document.querySelectorAll('.seat-box:not(.vip-seat)').forEach(seatBox => {
      const seatNo = seatBox.getAttribute('data-seat');

      if (bookedSeats[seatNo]) {
        seatBox.className = 'seat-box booked';
        const booker = bookedSeats[seatNo].fullName || 'มีผู้จอง';
        seatBox.innerHTML = `
          <span>${seatNo}</span>
          <span class="booker-name" title="${booker}">${booker}</span>
        `;
        if (selectedSeat === seatNo) {
          selectedSeat = null;
          if (displaySelectedSeat) displaySelectedSeat.textContent = '- ยังไม่ได้เลือก -';
          if (btnGotoForm) btnGotoForm.disabled = true;
        }
      } else {
        const isSelected = selectedSeat === seatNo;
        seatBox.className = `seat-box ${isSelected ? 'selected' : 'available'}`;
        seatBox.innerHTML = `<span>${seatNo}</span>`;
      }
    });
  }

  // ADMIN TOGGLE HANDLER
  if (btnToggleAdmin) {
    btnToggleAdmin.addEventListener('click', () => {
      if (!isAdminMode) {
        // ขอรหัสผ่านก่อนเข้าสู่ Admin Mode
        const password = prompt('กรุณาใส่รหัสผ่านเพื่อเข้าสู่โหมดผู้ดูแลระบบ:');
        if (password === 'Hod@2026') {
          isAdminMode = true;
          btnToggleAdmin.classList.add('admin-active');
          btnToggleAdmin.innerHTML = '🔓 Admin Mode (เปิด)';
          alert("🔑 เปิดใช้งาน Admin Mode สำเร็จ!\n\nคุณสามารถแตะที่นั่งที่มีผู้จองแล้วเพื่อกด 'ยกเลิกการจอง / ปลดล็อคที่นั่ง' ได้ทันที");
        } else if (password !== null) {
          alert("❌ รหัสผ่านไม่ถูกต้อง!");
        }
      } else {
        // ปิด Admin Mode
        isAdminMode = false;
        btnToggleAdmin.classList.remove('admin-active');
        btnToggleAdmin.innerHTML = '🔑 Admin Mode';
      }
      updateSeatsUI();
    });
  }

  // 3. FETCH DATA & POLLING FROM GOOGLE APPS SCRIPT / LOCALSTORAGE FALLBACK
  async function fetchSeatsAndEmployees() {
    if (!GAS_WEBAPP_URL) {
      const localData = JSON.parse(localStorage.getItem('bafs_booked_seats') || '{}');
      bookedSeats = localData;
      populateEmployeeDropdownFallback();
      updateSeatsUI();
      return;
    }

    try {
      const res = await fetch(GAS_WEBAPP_URL, { method: 'GET' });
      const data = await res.json();

      if (data && data.status === 'success') {
        bookedSeats = data.bookedSeats || {};
        employeeList = data.employees || [];

        populateEmployeeDropdown(employeeList);
        updateSeatsUI();
      }
    } catch (err) {
      console.warn("Could not fetch real-time seats from Apps Script:", err);
    }
  }

  function startPolling() {
    fetchSeatsAndEmployees();
    if (!pollingTimer) {
      pollingTimer = setInterval(fetchSeatsAndEmployees, 3000); // Polling ทุก 3 วินาที
    }
  }

  // Populate Employee Dropdown
  function populateEmployeeDropdown(list) {
    if (!userEmployeeSelect) return;
    const currentVal = userEmployeeSelect.value;
    userEmployeeSelect.innerHTML = '<option value="">-- กรุณาเลือกชื่อของคุณ --</option>';

    list.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.email || emp.fullName;
      opt.textContent = `${emp.fullName} (${emp.email || 'BAFS'}) ${emp.seatNo ? '❌ จองแล้ว: ' + emp.seatNo : '✅ ยังไม่จอง'}`;
      opt.setAttribute('data-name', emp.fullName);
      opt.setAttribute('data-dept', emp.email || 'BAFS GROUP');

      if (emp.seatNo) {
        opt.disabled = true;
      }
      userEmployeeSelect.appendChild(opt);
    });

    if (currentVal) userEmployeeSelect.value = currentVal;
  }

  function populateEmployeeDropdownFallback() {
    if (!userEmployeeSelect || userEmployeeSelect.options.length > 2) return;
    userEmployeeSelect.innerHTML = `
      <option value="">-- กรุณาเลือกชื่อของคุณ --</option>
      <option value="Kanit Seetong" data-name="Kanit Seetong" data-dept="kanit@bafs.co.th">Kanit Seetong (kanit@bafs.co.th)</option>
      <option value="Gritt Madisara" data-name="Gritt Madisara" data-dept="gritt.m@bafs.co.th">Gritt Madisara (gritt.m@bafs.co.th)</option>
      <option value="Anawat Kiatfuengfoo" data-name="Anawat Kiatfuengfoo" data-dept="anawat@bafs.co.th">Anawat Kiatfuengfoo (anawat@bafs.co.th)</option>
      <option value="Rachanok Sa-nguansub" data-name="Rachanok Sa-nguansub" data-dept="rachanok@bafs.co.th">Rachanok Sa-nguansub (rachanok@bafs.co.th)</option>
      <option value="Panita Promnart" data-name="Panita Promnart" data-dept="panita@bafs.co.th">Panita Promnart (panita@bafs.co.th)</option>
    `;
  }

  // Employee Dropdown Select Event
  if (userEmployeeSelect) {
    userEmployeeSelect.addEventListener('change', () => {
      const selectedOpt = userEmployeeSelect.options[userEmployeeSelect.selectedIndex];
      if (selectedOpt && selectedOpt.value) {
        const empName = selectedOpt.getAttribute('data-name');
        const empDept = selectedOpt.getAttribute('data-dept');
        if (inputName) inputName.value = empName || selectedOpt.value;
        if (inputDept) inputDept.value = empDept || 'BAFS GROUP';
      }
    });
  }

  // 4. STEP NAVIGATION CONTROLS
  if (btnGotoForm) {
    btnGotoForm.addEventListener('click', () => {
      if (!selectedSeat) {
        alert('กรุณาเลือกที่นั่งก่อนดำเนินการต่อ');
        return;
      }
      modalStepSeat.style.display = 'none';
      modalStepForm.style.display = 'block';
    });
  }

  if (btnBackToSeat) {
    btnBackToSeat.addEventListener('click', () => {
      modalStepForm.style.display = 'none';
      modalStepSeat.style.display = 'block';
    });
  }

  // 5. MOOD SELECTOR INTERACTION
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      moodButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMood = btn.getAttribute('data-mood');
      selectedEmoji = btn.getAttribute('data-emoji');
    });
  });

  // 6. GENERATE & SUBMIT BOOKING TO BACKEND
  if (btnGenerateTicket) {
    btnGenerateTicket.addEventListener('click', async () => {
      const nameVal = inputName ? inputName.value.trim() : '';
      const deptVal = inputDept ? inputDept.value.trim() : '';
      const selectVal = userEmployeeSelect ? userEmployeeSelect.value : '';

      if (!selectedSeat) {
        alert('เกิดข้อผิดพลาด: ไม่พบข้อมูลที่นั่งที่เลือก');
        modalStepForm.style.display = 'none';
        modalStepSeat.style.display = 'block';
        return;
      }

      if (!nameVal && !selectVal) {
        alert('กรุณาเลือกชื่อของคุณ หรือระบุชื่อ-นามสกุลก่อนออกบัตร');
        return;
      }

      const origBtnText = btnGenerateTicket.innerHTML;
      btnGenerateTicket.disabled = true;
      btnGenerateTicket.innerHTML = `
        <svg style="width: 18px; height: 18px; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>
        <span>กำลังยืนยันการจองที่นั่ง...</span>
      `;

      // SUBMIT TO APPS SCRIPT OR LOCALSTORAGE
      if (GAS_WEBAPP_URL) {
        try {
          const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              seatNo: selectedSeat,
              email: selectVal || deptVal,
              name: nameVal,
              dept: deptVal,
              mood: selectedMood
            })
          });

          const result = await response.json();

          if (result.status === 'error') {
            alert(result.message || 'ไม่สามารถจองที่นั่งได้');
            btnGenerateTicket.disabled = false;
            btnGenerateTicket.innerHTML = origBtnText;
            fetchSeatsAndEmployees();
            modalStepForm.style.display = 'none';
            modalStepSeat.style.display = 'block';
            return;
          }
        } catch (err) {
          console.warn("Backend error, proceeding with local render:", err);
        }
      } else {
        const localData = JSON.parse(localStorage.getItem('bafs_booked_seats') || '{}');
        localData[selectedSeat] = { fullName: nameVal || 'พนักงาน BAFS', email: deptVal };
        localStorage.setItem('bafs_booked_seats', JSON.stringify(localData));
        bookedSeats = localData;
      }

      // RENDER FINAL VIP TICKET
      if (displayName) displayName.textContent = nameVal || 'พนักงาน BAFS GROUP';
      if (displayDept) displayDept.textContent = deptVal || 'BAFS GROUP Team';
      if (displayMood) displayMood.textContent = `${selectedEmoji} รู้สึก: ${selectedMood}`;
      if (displaySeat) displaySeat.textContent = selectedSeat;

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const passCode = `STS-2026-${selectedSeat}-${randomNum}`;
      if (ticketSerialNo) ticketSerialNo.textContent = `PASS #${passCode}`;

      // Render Dynamic QR Code
      if (qrcodeTarget) {
        qrcodeTarget.innerHTML = '';
        new QRCode(qrcodeTarget, {
          text: `https://bafs.co.th/safe-to-share?pass=${encodeURIComponent(passCode)}&seat=${encodeURIComponent(selectedSeat)}&name=${encodeURIComponent(nameVal)}`,
          width: 84,
          height: 84,
          colorDark: "#0d9488",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      }

      btnGenerateTicket.disabled = false;
      btnGenerateTicket.innerHTML = origBtnText;

      // Transition to Step 3 (Ticket Render)
      modalStepForm.style.display = 'none';
      modalStepTicket.style.display = 'block';

      fetchSeatsAndEmployees();
    });
  }

  // 7. DOWNLOAD TICKET AS HIGH-RES PNG
  if (btnDownloadTicket) {
    btnDownloadTicket.addEventListener('click', () => {
      const ticketCard = document.getElementById('vip-ticket-render');
      const nameVal = inputName ? inputName.value.trim() : 'BAFS_Member';

      const origText = btnDownloadTicket.innerHTML;
      btnDownloadTicket.innerHTML = `
        <svg style="width: 18px; height: 18px; animation: spin 1s linear infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>
        <span>กำลังประมวลผลรูปภาพความละเอียดสูง...</span>
      `;

      html2canvas(ticketCard, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Safe_to_Share_VIP_Pass_${selectedSeat}_${(nameVal || 'Member').replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        btnDownloadTicket.innerHTML = origText;
      }).catch(err => {
        console.error("Canvas export failed: ", err);
        alert("เกิดข้อผิดพลาดในการสร้างไฟล์รูปภาพ กรุณาลองใหม่อีกครั้ง");
        btnDownloadTicket.innerHTML = origText;
      });
    });
  }

  // Initialize
  initSeatMap();
  startPolling();

});
