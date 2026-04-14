SELECT
  MIN(date) AS earliest_date,
  MAX(date) AS latest_date,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT date) AS unique_dates
FROM desk_bookings;
