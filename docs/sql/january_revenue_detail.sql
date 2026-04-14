WITH unique_bookings AS (
  SELECT DISTINCT ON (desk_id, start_date)
    desk_id,
    start_date,
    end_date,
    status,
    person_name,
    price,
    (SELECT COUNT(*) FROM generate_series(start_date::date, end_date::date, '1 day') d
     WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) AS total_business_days,
    (SELECT COUNT(*) FROM generate_series(
      GREATEST(start_date::date, '2026-01-01'::date),
      LEAST(end_date::date, '2026-01-31'::date),
      '1 day') d
     WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) AS jan_business_days
  FROM desk_bookings
  WHERE date >= '2026-01-01' AND date <= '2026-01-31'
  ORDER BY desk_id, start_date, date
)
SELECT
  desk_id,
  person_name,
  start_date,
  end_date,
  status,
  price AS total_price,
  total_business_days,
  jan_business_days,
  CASE
    WHEN total_business_days > 0
    THEN ROUND((jan_business_days::numeric / total_business_days) * price, 2)
    ELSE 0
  END AS jan_prorated_price
FROM unique_bookings
ORDER BY desk_id, start_date;
