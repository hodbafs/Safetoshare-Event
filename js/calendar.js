/* ==========================================================================
   SAFE TO SHARE : ปลอดภัยที่จะเล่า (น้องพิงใจ) — CALENDAR INTEGRATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const btnAddCalendar = document.getElementById('btn-add-calendar');

  if (btnAddCalendar) {
    btnAddCalendar.addEventListener('click', () => {
      const title = encodeURIComponent("Safe to share : ปลอดภัยที่จะเล่า (BAFS CoachHub Program)");
      const details = encodeURIComponent("ขอเชิญพี่น้องชาว BAFS ร่วมสัมผัสประสบการณ์ใหม่ในพื้นที่เปิดใจและเติบโตไปด้วยกัน โครงการ Safe to share @ BAFS GRAND HALL");
      const location = encodeURIComponent("BAFS GRAND HALL");

      // Date Format for Google Calendar: YYYYMMDDTHHMMSSZ (UTC or local)
      // 19/08/2026 09.30 - 11.30 (Asia/Bangkok UTC+7 -> 02.30 - 04.30 UTC)
      const startDateStr = "20260819T023000Z";
      const endDateStr = "20260819T043000Z";

      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;

      // Generate .ics File Content
      const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BAFS//Safe To Share Event//TH
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:Safe to share : ปลอดภัยที่จะเล่า (BAFS CoachHub Program)
DESCRIPTION:ขอเชิญพี่น้องชาว BAFS ร่วมสัมผัสประสบการณ์ใหม่ในพื้นที่เปิดใจและเติบโตไปด้วยกัน @ BAFS GRAND HALL
LOCATION:BAFS GRAND HALL
DTSTART:20260819T023000Z
DTEND:20260819T043000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

      // Trigger .ics Download
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'Safe_to_Share_Event_2026.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Open Google Calendar in new tab
      window.open(googleCalUrl, '_blank');
    });
  }

});
