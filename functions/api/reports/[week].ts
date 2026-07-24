import { buildReport, error, json, validWeek, type Env } from "../../_lib";

export const onRequestGet: PagesFunction<Env, "week"> = async ({ env, params }) => {
  const week = String(params.week);
  if (!validWeek(week)) return error("INVALID_WEEK", "周报日期必须是有效的周一日期");
  return json(await buildReport(env.WEEKLY_REPORTS, week));
};
