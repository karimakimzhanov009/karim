function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ===== ЛИСТ 1: Сводка по кандидатам =====
    var summarySheet = ss.getSheetByName("Кандидаты");
    if (!summarySheet) {
      summarySheet = ss.insertSheet("Кандидаты");
      summarySheet.appendRow([
        "Дата", 
        "Время",
        "Имя кандидата", 
        "Контакт",
        "Кол-во ответов",
        "⚠️ Нарушения",
        "Consent",
        "Фото",
        "Session ID"
      ]);
      // Форматирование заголовков
      summarySheet.getRange(1, 1, 1, 9).setBackground("#4285f4").setFontColor("white").setFontWeight("bold");
      summarySheet.setFrozenRows(1);
    }

    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    var candidate = data.candidate || {};
    var enrichedResponses = data.enrichedResponses || [];
    var timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    var violationCount = data.violationCount || 0;
    var isConsentGiven = data.isConsentGiven ? "Yes" : "No";
    
    // Обработка фото
    var photoUrl = "Нет фото";
    if (data.photoBase64) {
      try {
        var decoded = Utilities.base64Decode(data.photoBase64);
        var blob = Utilities.newBlob(decoded, "image/jpeg", candidate.name + "_" + data.sessionId + ".jpg");
        // Создаем файл в корне Drive
        var file = DriveApp.createFile(blob);
        // Делаем файл доступным по ссылке (кто имеет ссылку)
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();
      } catch (e) {
        photoUrl = "Ошибка фото: " + e.toString();
      }
    }

    // Добавляем строку в сводку
    var summaryRow = [
      Utilities.formatDate(timestamp, "GMT+5", "dd.MM.yyyy"),
      Utilities.formatDate(timestamp, "GMT+5", "HH:mm"),
      candidate.name || "Не указано",
      candidate.contact || "Не указано",
      enrichedResponses.length,
      violationCount > 0 ? "⚠️ " + violationCount : "✅ 0",
      isConsentGiven,
      photoUrl,
      data.sessionId
    ];
    summarySheet.appendRow(summaryRow);

    // ===== ЛИСТ 2: Детальные ответы =====
    // Если это просто регистрация (нет ответов), мы не пишем ничего в лист ответов
    if (enrichedResponses.length > 0) {
      var detailSheet = ss.getSheetByName("Ответы");
      if (!detailSheet) {
        detailSheet = ss.insertSheet("Ответы");
        detailSheet.appendRow([
          "Дата",
          "Имя кандидата",
          "№ вопроса",
          "Вопрос",
          "Ответ студента",
          "Правильный ответ",
          "Макс. балл"
        ]);
        // Форматирование заголовков
        detailSheet.getRange(1, 1, 1, 7).setBackground("#34a853").setFontColor("white").setFontWeight("bold");
        detailSheet.setFrozenRows(1);
        // Ширина колонок
        detailSheet.setColumnWidth(4, 300); // Вопрос
        detailSheet.setColumnWidth(5, 400); // Ответ студента
        detailSheet.setColumnWidth(6, 300); // Правильный ответ
      }

      var detailRows = enrichedResponses.map(function(item, index) {
        return [
          Utilities.formatDate(timestamp, "GMT+5", "dd.MM.yyyy"),
          candidate.name || "Не указано",
          item.id || (index + 1),
          item.title || "Без названия",
          item.answer || "",
          item.correctAnswer || "—",
          item.maxPoints || "—"
        ];
      });
      
      // Добавляем все строки сразу
      if (detailRows.length > 0) {
        detailSheet.getRange(
          detailSheet.getLastRow() + 1, 
          1, 
          detailRows.length, 
          7
        ).setValues(detailRows);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
