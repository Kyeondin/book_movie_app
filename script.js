"use strict";

const STORAGE_KEY = "book-movie-records";
const FUTURE_DATE_MESSAGE = "오늘 이전 날짜만 입력할 수 있습니다";

const form = document.querySelector("#record-form");
const typeInput = document.querySelector("#type");
const titleInput = document.querySelector("#title");
const creatorInput = document.querySelector("#creator");
const dateInput = document.querySelector("#date");
const ratingInput = document.querySelector("#rating");
const reviewInput = document.querySelector("#review");
const creatorLabel = document.querySelector("#creator-label");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const formMessage = document.querySelector("#form-message");
const storageMessage = document.querySelector("#storage-message");
const filterInput = document.querySelector("#filter");
const recordList = document.querySelector("#record-list");

let records = [];
let editingId = null;

function localDateString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    (value.type === "book" || value.type === "movie") &&
    typeof value.title === "string" &&
    typeof value.creator === "string" &&
    typeof value.date === "string" &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    typeof value.review === "string" &&
    Number.isFinite(value.createdAt)
  );
}

function showStorageError(message) {
  storageMessage.textContent = message;
  storageMessage.hidden = false;
  form.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = true;
  });
  filterInput.disabled = true;
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      return;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
      showStorageError("저장된 기록을 읽을 수 없습니다. 브라우저의 저장 데이터를 확인해 주세요.");
      return;
    }
    records = parsed;
  } catch {
    showStorageError("브라우저 저장 공간에 접근할 수 없습니다. 사이트의 저장 권한을 확인해 주세요.");
  }
}

function persistRecords(nextRecords) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const latestRecords = saved === null ? [] : JSON.parse(saved);
    if (!Array.isArray(latestRecords) || !latestRecords.every(isRecord)) {
      formMessage.textContent = "최신 저장 데이터를 읽을 수 없어 기록을 저장하지 못했습니다.";
      return false;
    }

    const nextIds = new Set(nextRecords.map((record) => record.id));
    const removedIds = new Set(
      records.filter((record) => !nextIds.has(record.id)).map((record) => record.id),
    );
    const mergedRecords = latestRecords.filter((record) => !removedIds.has(record.id));

    for (const nextRecord of nextRecords) {
      const previousRecord = records.find((record) => record.id === nextRecord.id);
      const changed =
        !previousRecord ||
        previousRecord.type !== nextRecord.type ||
        previousRecord.title !== nextRecord.title ||
        previousRecord.creator !== nextRecord.creator ||
        previousRecord.date !== nextRecord.date ||
        previousRecord.rating !== nextRecord.rating ||
        previousRecord.review !== nextRecord.review ||
        previousRecord.createdAt !== nextRecord.createdAt;

      if (changed) {
        const index = mergedRecords.findIndex((record) => record.id === nextRecord.id);
        if (index === -1) {
          mergedRecords.push(nextRecord);
        } else {
          mergedRecords[index] = nextRecord;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedRecords));
    records = mergedRecords;
    return true;
  } catch {
    formMessage.textContent = "기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.";
    return false;
  }
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function renderRecords() {
  recordList.replaceChildren();

  const selectedType = filterInput.value;
  const visibleRecords = records
    .filter((record) => selectedType === "all" || record.type === selectedType)
    .sort((first, second) => {
      const byDate = second.date.localeCompare(first.date);
      return byDate || second.createdAt - first.createdAt;
    });

  if (visibleRecords.length === 0) {
    const message =
      records.length === 0
        ? "아직 기록이 없어요. 첫 번째 기록을 남겨 보세요."
        : "이 종류의 기록이 아직 없어요.";
    const emptyState = makeElement("div", "empty-state");
    emptyState.append(makeElement("p", "", message));
    recordList.append(emptyState);
    return;
  }

  for (const record of visibleRecords) {
    recordList.append(createRecordCard(record));
  }
}

function createRecordCard(record) {
  const card = makeElement("article", "record-card");
  const content = makeElement("div", "record-content");
  const topLine = makeElement("div", "record-topline");
  const kindLabel = record.type === "book" ? "책" : "영화";
  const badge = makeElement(
    "span",
    `type-badge${record.type === "movie" ? " movie" : ""}`,
    kindLabel,
  );
  topLine.append(badge, makeElement("time", "record-date", formatDate(record.date)));
  content.append(topLine, makeElement("h3", "record-title", record.title));

  if (record.creator) {
    const creatorRole = record.type === "book" ? "작가" : "감독";
    content.append(makeElement("p", "record-creator", `${creatorRole} · ${record.creator}`));
  }

  const stars = "★".repeat(record.rating) + "☆".repeat(5 - record.rating);
  const rating = makeElement("p", "record-rating", stars);
  rating.setAttribute("aria-label", `별점 ${record.rating}점`);
  content.append(rating);

  if (record.review) {
    content.append(makeElement("p", "record-review", record.review));
  }

  const actions = makeElement("div", "record-actions");
  const editButton = makeElement("button", "text-button", "수정");
  editButton.type = "button";
  editButton.addEventListener("click", () => beginEditing(record));
  const deleteButton = makeElement("button", "text-button delete", "삭제");
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => deleteRecord(record.id));
  actions.append(editButton, deleteButton);

  card.append(content, actions);
  return card;
}

function updateCreatorLabel() {
  creatorLabel.textContent = typeInput.value === "book" ? "작가" : "감독";
}

function clearFormMessage() {
  formMessage.textContent = "";
}

function validateDateInput() {
  const today = localDateString();
  dateInput.max = today;
  const isFutureDate = dateInput.value > today;
  dateInput.setCustomValidity(isFutureDate ? FUTURE_DATE_MESSAGE : "");

  if (isFutureDate) {
    formMessage.textContent = FUTURE_DATE_MESSAGE;
  } else if (formMessage.textContent === FUTURE_DATE_MESSAGE) {
    clearFormMessage();
  }

  return !isFutureDate;
}

function resetForm() {
  form.reset();
  dateInput.value = localDateString();
  validateDateInput();
  editingId = null;
  submitButton.textContent = "기록 저장";
  cancelEditButton.hidden = true;
  clearFormMessage();
  updateCreatorLabel();
}

function beginEditing(record) {
  editingId = record.id;
  typeInput.value = record.type;
  titleInput.value = record.title;
  creatorInput.value = record.creator;
  dateInput.value = record.date;
  ratingInput.value = String(record.rating);
  reviewInput.value = record.review;
  submitButton.textContent = "수정 내용 저장";
  cancelEditButton.hidden = false;
  clearFormMessage();
  validateDateInput();
  updateCreatorLabel();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  titleInput.focus({ preventScroll: true });
}

function deleteRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record || !window.confirm(`"${record.title}" 기록을 삭제할까요?`)) {
    return;
  }

  const nextRecords = records.filter((item) => item.id !== id);
  if (persistRecords(nextRecords)) {
    if (editingId === id) {
      resetForm();
    }
    renderRecords();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormMessage();
  titleInput.setCustomValidity("");

  if (!validateDateInput()) {
    dateInput.reportValidity();
    return;
  }

  if (titleInput.value.trim() === "") {
    titleInput.setCustomValidity("제목을 입력해 주세요.");
    titleInput.reportValidity();
    return;
  }

  const existingRecord = records.find((record) => record.id === editingId);
  const nextRecord = {
    id: editingId ?? crypto.randomUUID(),
    type: typeInput.value,
    title: titleInput.value.trim(),
    creator: creatorInput.value.trim(),
    date: dateInput.value,
    rating: Number(ratingInput.value),
    review: reviewInput.value.trim(),
    createdAt: existingRecord?.createdAt ?? Date.now(),
  };

  let latestRecords = records;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
        formMessage.textContent = "최신 저장 데이터를 읽을 수 없어 기록을 저장하지 못했습니다.";
        return;
      }
      latestRecords = parsed;
    }
  } catch {
    formMessage.textContent = "브라우저 저장 공간에 접근할 수 없어 기록을 저장하지 못했습니다.";
    return;
  }

  const normalizedTitle = nextRecord.title.toLowerCase();
  const hasDuplicate = latestRecords.some(
    (record) =>
      record.id !== editingId &&
      record.type === nextRecord.type &&
      record.title.trim().toLowerCase() === normalizedTitle,
  );
  if (
    hasDuplicate &&
    !window.confirm("이미 같은 제목의 기록이 있습니다. 그래도 저장할까요?")
  ) {
    return;
  }

  if (!isRecord(nextRecord)) {
    formMessage.textContent = "입력 내용을 확인해 주세요. 종류, 날짜, 별점은 필수입니다.";
    return;
  }

  const nextRecords = editingId
    ? records.map((record) => (record.id === editingId ? nextRecord : record))
    : [...records, nextRecord];

  if (persistRecords(nextRecords)) {
    resetForm();
    renderRecords();
  }
});

titleInput.addEventListener("input", () => {
  titleInput.setCustomValidity("");
});

dateInput.addEventListener("input", validateDateInput);
dateInput.addEventListener("change", validateDateInput);
typeInput.addEventListener("change", updateCreatorLabel);
filterInput.addEventListener("change", renderRecords);
cancelEditButton.addEventListener("click", resetForm);

dateInput.value = localDateString();
validateDateInput();
loadRecords();
renderRecords();
