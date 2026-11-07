// 仮のトップページ。B5 で「今日の買い時」に置き換える
export default function Home() {
  return (
    <section className="card">
      <h1>今が買いどき？</h1>
      <p className="sub">いつものペット用品の買いどきを、まもなくお知らせします。</p>
      <p>
        <span className="chip chip-deal">おトク</span>{" "}
        <span className="chip chip-low">あと19日分</span>
      </p>
      <p>
        実質最安は <span className="price">1,980円</span>
      </p>
    </section>
  );
}
