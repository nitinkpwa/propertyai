import HomePage from "./components/home/HomePage";

/** Cache public shell HTML via OpenNext R2/regional cache. */
export const revalidate = 60;

export default function Page() {
  return <HomePage />;
}
