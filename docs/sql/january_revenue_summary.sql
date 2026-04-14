WITH unique_bookings AS (
  SELECT DISTINCT ON (desk_id, start_date)
    desk_id,
    start_date,
    end_date,
    status,
    price,
    (SELECT COUNT(*) FROM generate_series(start_date::date, end_date::date, '1 day') d
     WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) AS total_biz_days,
    (SELECT COUNT(*) FROM generate_series(
      GREATEST(start_date::date, '2026-01-01'::date),
      LEAST(end_date::date, '2026-01-31'::date),
      '1 day') d
     WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) AS jan_biz_days
  FROM desk_bookings
  WHERE date >= '2026-01-01' AND date <= '2026-01-31'
  ORDER BY desk_id, start_date, date
)
SELECT
  SUM(CASE WHEN status = 'assigned'
      THEN ROUND((jan_biz_days::numeric / NULLIF(total_biz_days, 0)) * price, 2)
      ELSE 0 END) AS confirmed_revenue,
  SUM(CASE WHEN status = 'booked'
      THEN ROUND((jan_biz_days::numeric / NULLIF(total_biz_days, 0)) * price, 2)
      ELSE 0 END) AS expected_revenue,
  SUM(ROUND((jan_biz_days::numeric / NULLIF(total_biz_days, 0)) * price, 2)) AS total_revenue
FROM unique_bookings;
