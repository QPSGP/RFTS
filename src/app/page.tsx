/* eslint-disable react/no-unescaped-entities */
import SiteFooter from "@/components/SiteFooter";
import { isMemberLoggedIn } from "@/lib/member-session";
import { HOMEPAGE_GOAL_CARDS } from "@/lib/homepage-goals";
import { MEDITATION_SOURCES, WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

const MARKETING_SIGNUP_HREF = buildMarketingSignupHref();

function MeditationBenefitLink({
  label,
  path,
  sourceIndex
}: {
  label: string;
  path: string;
  sourceIndex: number;
}) {
  const sourceNum = sourceIndex + 1;
  return (
    <a
      href={path}
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      }}
      aria-label={`${label} — learn more with research source ${sourceNum}`}
    >
      {label}
      <span style={{ display: "block", marginTop: 8, fontSize: 13, color: "#0f766e" }}>
        Source [{sourceNum}]
      </span>
    </a>
  );
}

function GoalImageLink({ label, src, href }: { label: string; src: string; href: string }) {
  return (
    <a
      href={href}
      aria-label={`${label}: Learn more about ${label} goals`}
      style={{
        display: "block",
        aspectRatio: "16/10",
        marginBottom: 12,
        borderRadius: 8,
        overflow: "hidden",
        background: "#f3f4f6",
        textDecoration: "none",
        outlineOffset: 2
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </a>
  );
}

export default async function HomePage() {
  const showSignupCta = !(await isMemberLoggedIn());

  return (
    <main>
      <section className="hero section">
        <span className="pill">Conscious Growth Engine</span>
        <h1>Imagine … The Best You</h1>
        <p>
          Overcome present challenges and take your goals from dream to reality
          all while falling asleep and during sleep.
        </p>
        <p>
          Check out the video to learn more about our innovative algorithm which
          uses your specified, prioritized goals to provide targeted meditations
          each night you listen.
        </p>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <video
            controls
            playsInline
            preload="metadata"
            style={{ maxWidth: "100%", width: 640, borderRadius: 8 }}
          >
            <source src="/Images/Terry-Sizzle-Reel-Website.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="cta-row hero-cta" style={{ gap: 16, alignItems: "center", justifyContent: "center" }}>
            {showSignupCta && (
              <a className="button" href={MARKETING_SIGNUP_HREF}>
                Start Your Journey
              </a>
            )}
            {showSignupCta && <strong>14 Day Free Trial!</strong>}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How Reach For The Stars Meditation Application Works</span>
          <h2 className="section-title">Personalized sleep sessions, nightly.</h2>
          <p className="section-subtitle">
            Guided meditations cycle through your goals so your subconscious receives
            the right messages at the right time.
          </p>
        </div>
        <p>
          The Reach for the Stars application customizes guided meditation
          recordings to your specific desires. With this application, recordings
          to help you with your most important goals will be played in rotation,
          ensuring you hear the messages on the subconscious level while falling
          asleep. These quality recordings are scheduled based on your unique
          goals and desires, aiding you to reach your Highest Potential in areas
          physical, mental, emotional, spiritual, and financial.
        </p>
        <p>
          With this application, the meditations play, based upon your choice
          either 1 or 2 in rotation each night over a period of weeks or months,
          21 times each: the required number of repetitions to establish a new
          mindset. These meditations, constantly being created and added to our
          library, are selected by a highly trained professional hypnotherapist
          and scheduled according to priorities you select.
        </p>
        <p>
          Membership is designed to meet your needs, ensuring you can easily be
          on the road to achieving your goals.
        </p>
        <p>
          You can update your goals anytime; new recordings are scheduled based on your
          current goals.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Nightly Activation</span>
          <h2 className="section-title">
            Imagine the Genie of Your Powerful Subconscious Mind Activated Each
            Night to Create:
          </h2>
        </div>
        <section className="grid grid-3" style={{ marginTop: 16 }}>
          {HOMEPAGE_GOAL_CARDS.map((goal) => (
            <div key={goal.slug} className="card glow">
              <GoalImageLink label={goal.label} src={goal.imageSrc} href={goal.path} />
              <h3>
                <a href={goal.path} style={{ color: "inherit", textDecoration: "none" }}>
                  {goal.label}
                </a>
              </h3>
              <p>{goal.tagline}</p>
            </div>
          ))}
        </section>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Guided Meditations</span>
          <h2 className="section-title">10 Scientifically Proven Benefits</h2>
        </div>
        <section className="grid grid-2" style={{ marginTop: 16 }}>
          {WELLNESS_BENEFIT_LINKS.map((benefit) => (
            <MeditationBenefitLink
              key={benefit.label}
              label={benefit.label}
              path={benefit.path}
              sourceIndex={benefit.sourceIndex}
            />
          ))}
        </section>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Sources</h3>
          <ol>
            {MEDITATION_SOURCES.map((source, index) => (
              <li key={source.href} id={`meditation-source-${index + 1}`}>
                <a href={source.href} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">About</span>
          <h2 className="section-title">About Terry Brussel-Rogers, CCHt.</h2>
          <p className="section-subtitle">
            Certified Clinical Hypnotherapist Registered With The National Guild Of
            Hypnotists
          </p>
        </div>
        <p>
          With over 5 decades of experience, Terry Brussel-Rogers, CCHt has been
          helping clients reach their highest potential most of her life. She
          has done this through her Seven Keys to Self-Actualization, a
          systematic program which uses self-hypnosis within a customized
          framework to enable others to realize their personal goals, desires,
          and dreams.
        </p>
        <p>
          Terry graduated Cum Laude from California State University at
          Northridge with a B.A. in Psychology. She also studied for four years
          at the Hypnosis Motivation Institute, the Emile Franchel School of
          Living Science, and the Hypnotism Training Center.
        </p>
        <p>
          In her work in private practice and directing Success Center, Terry
          has assisted her clients and has taught hypnotists, healers, and
          coaches in the U.S., Canada, U.K., and many other countries to work
          with such issues as stress management, habit control, success/sales
          motivation, and learning/memory enhancement.
        </p>
        <p>
          Articles she has written have included from Stress to Success Stress
          Strategists (Royal Publishing forward by Dr. Norman Vincent Peale),
          Slow Down and Turn Back the Aging Process for Healthy Longevity, and
          Memory and Mental Excellence through Self Hypnosis. Terry
          Brussel-Rogers, CCHt has also written many books including Seven Key
          Turn-Key System for Building a Successful Hypnotherapy Practice,
          Matchmaker&apos;s Corner: Choosing, Finding and Attracting Your Life Mate,
          The Spiritual Spark: Hypnotic Enhancement of Psychic Abilities,
          Inspiration at Will, and Take Command of your Body: the Hypnotic
          Fountain of Youth, among many others.
        </p>
        <p>
          She has created many unique audio recordings and books, which are all
          available for purchase through her web site www.acesuccess.com
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Trust</span>
          <h2 className="section-title">Thousands Of People Already Trust Us</h2>
          <p className="section-subtitle">... For A Reason</p>
        </div>
        <section className="grid grid-4" style={{ marginTop: 16 }}>
          <div className="card stat-card">
            <h3>50 +</h3>
            <p>Years Experience</p>
          </div>
          <div className="card stat-card">
            <h3>5000 +</h3>
            <p>Happy Clients</p>
          </div>
          <div className="card stat-card">
            <h3>1000 +</h3>
            <p>Seminars Delivered</p>
          </div>
          <div className="card stat-card">
            <h3>∞</h3>
            <p>Number of Learning Paths</p>
          </div>
        </section>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Testimonials</span>
          <h2 className="section-title">Customer Reviews</h2>
          <p className="section-subtitle">All Testimonials</p>
        </div>
        <section className="grid">
          <div className="card">
            <h3>Positive Assertiveness and Effective Time Management</h3>
            <p>
              I am standing up for myself and making time to do what needs to be
              done in the order of my priorities. My hypnosis sessions with
              Terry Brussel-Rogers and listening to the Reach for the Stars
              meditations customized to my my goals are making a difference for
              me.
            </p>
            <p>L. S., PR Consultant. Long Beach, Ca 90807</p>
          </div>
          <div className="card">
            <h3>Sales Excellence Through Private Sessions And Reach For The Stars</h3>
            <p>
              I had a record sales week-closed 50K in one week! My relationship
              with my wife is good. I feel more confident to handle the move we
              are doing to Cincinatti where our family. I&apos;m sleeping well
              listening to Reach for the Stars guided meditations at night., My
              hypnosis sessions by phone at Success Center and the customized
              guided meditations at night are really working for me.
            </p>
            <p>K. M., CEO of Digital Marketing Agency. Temecula, California</p>
          </div>
          <div className="card">
            <h3>Pain Relief through Reach for the Stars</h3>
            <p>
              For the past 10 years I have had problems with pain in my legs,
              especially the left knee, as a result of osteoarthritis and
              myofascial trigger points. I started beta testing the night time
              version of the Success Center Hypnotherapy app on a nightly basis
              and noticed a decrease in pain when my CGMR (Customized Goal
              Manifestation Recording) was part of the mix. When Hypnotic
              Natural Pain Relief became part of the mix a few nights ago the
              results were even faster. Last night, for the first time in 10
              years I slept through the night and awoke with no pain. I usually
              awake in pain around 6am and need to take medication to return to
              sleep. This was the first morning I slept through the night and
              did not wake up until 9:30. I continue to be pain free as I write
              this and now have a tool in the daytime version of the app to use
              if the pain returns. I look forward to other changes as more
              conditions are addressed.
            </p>
            <p>R. H., Computer programmer, Organic Gardening Consultant. La Verne, Ca.91750</p>
          </div>
          <div className="card">
            <h3>Hypnotic Natural Pain Relief –Fybromyalgia</h3>
            <p>
              When I got up this morning, I had pain all through my right side
              from the top of my head to my buttocks. After listening to your
              Natural Pain Relief hypnotic recording, I had no pain anywhere. It
              worked for my joint pain (from fibromyalgia) and the pain from
              yesterday&apos;s dental surgery too!
            </p>
            <p>K. D. B., Hypnotherapist. Orange County, Cal.</p>
          </div>
          <div className="card">
            <h3>Memory Excellence Lifelong</h3>
            <p>
              I wanted to let you know that the Golden Years [recording] is
              working quite well. I have listened to it about 5 times in the
              last few days and the results are excellent! I look forward to the
              next program
            </p>
            <p>T. W.,</p>
          </div>
          <div className="card">
            <h3>Calmer Driving With Positive Stress Management</h3>
            <p>
              I am so much calmer. I was driving in my car the other day. I felt
              stressed. I was able to calm myself right away using the techniques
              we have been working with in our hypnosis sessions together and by
              listening to my Customized Goal Manifestation and Catalyst
              Coaching recordings at night.
            </p>
            <p>K. D. B., Financial Advisor and Hypnotherapist. Costa Mesa, Ca</p>
          </div>
          <div className="card">
            <h3>Memory Recovery for 69 Year old through Memory Excellence: No More Senior Moments</h3>
            <p>
              I am a 69 year old who suffers memory loss from alcohol abuse in
              early life and bipolar medical prescription drug use for 35 years
              and I only recently started using TLB&apos;s Memory Excellence
              [recording]. The results have literally blown me away. I have
              never had improvement with such speed of recovery and clarity in
              any self help endeavor and I have had therapy of every kind: for
              PTSD, with EMDR, private counselling and self help in many forms
              throughout my lifetime.
            </p>
            <p>M. L. M., Durango</p>
          </div>
          <div className="card">
            <h3>Benefits of Professional Version Life Guidance Discovery Session</h3>
            <p>
              I experienced a unique approach to the practice of hypnotherapy
              and thought it should be noted by those who can benefit from it.
              To what I am referring to is an unusual (I think) USP for the
              field of hypnotherapy and coaching. I participated in what Terry
              Brussel calls a Life Guidance Discovery session and found it to be
              a very interesting and positive methodology. Basically I had to
              really think about my attitudes and goals toward all parts of my
              life and order them as to importance and priority. I never did
              this before at this level of detail. This LGD process is designed
              to be used primarily by hypnotherapists of which [Terry
              Brussel-Rogers] is one, but, as a professional life coach I can see
              the value elsewhere.
            </p>
            <p>C. M., Professional Life Coach. San Diego, Ca.</p>
          </div>
          <div className="card">
            <h3>Family Harmony and CGMR Praise</h3>
            <p>
              I am really getting results with our hypnosis sessions, Terry. I
              am more relaxed and less reactive in family situations. I am so
              enjoying the Customized Goal Manifestation Recording you made with
              my individual affirmations and suggestions in it. Thank you!
            </p>
            <p>M. L., Ranch Manager. Parlier, California</p>
          </div>
          <div className="card">
            <h3>Making A Living Doing What I Love!</h3>
            <p>
              For the first time in two years I covered my rent and other bills
              from my work with private clients instead of my day job. My
              Customised Goal Manifestation recording from Success Center is
              really making a difference in my cash flow and my ability to
              devote myself to doing the work I love!
            </p>
            <p>S., Relationship and Life Coach. Van Nuys, California</p>
          </div>
          <div className="card">
            <h3>Life Guidance Discovery Session Worked!</h3>
            <p>
              The Life Guidance Discovery Session I took with Terry
              Brussel-Rogers made a huge difference for me in areas of POSITIVE
              STRESS MANAGEMENT; FOCUS, CONCENTRATION AND SHARP, CLEAR MEMORY;
              ENDING PROCRASTINATION; RELATIONSHIP JOY AND SUCCESS! I would
              certainly recommend her to anyone seriously interested in making
              their goals a reality.
            </p>
            <p>C. F., Business Owner. Topanga, Calif.</p>
          </div>
          <div className="card">
            <h3>Spirit Guide Connection</h3>
            <p>
              Terry, I wanted to tell you that this last Life Guidance session
              you did with me over the phone was especially powerful since a
              Native American entity showed up in my "room with my screen and my
              door" and assured me that the things I am working on accomplishing
              will come to pass and to not doubt that. This has never happened
              before and, now, even after the session is over, feels very real.
              I am pretty sure that he is my personal spirit guide as I have
              always felt that I had a connection with the Native Americans yet
              have no history or blood relations with them. Thank you for your
              excellent work. Peace and Light, David.
            </p>
            <p>D. S., Business/Life Coach. Phoenix, Arizona</p>
          </div>
          <div className="card">
            <h3>Family Harmony and CGMR Praise</h3>
            <p>
              I am really getting results with our hypnosis sessions, Terry. I
              am more relaxed and less reactive in family situations. I am so
              enjoying the Customized Goal Manifestation Recording you made with
              my individual affirmations and suggestions in it. Thank you!
            </p>
            <p>M. L., Ranch Manager. Parlier, California</p>
          </div>
          <div className="card">
            <h3>Positive Assertiveness and Effective Time Management</h3>
            <p>
              I am standing up for myself and making time to do what needs to be
              done in the order of my priorities. My hypnosis sessions with
              Terry Brussel-Rogers and listening to the Reach for the Stars
              meditations customized to my my goals are making a difference for
              me.
            </p>
            <p>L. S., PR Consultant. Long Beach, Ca 90807</p>
          </div>
          <div className="card">
            <h3>Sales Excellence Through Private Sessions And Reach For The Stars</h3>
            <p>
              I had a record sales week-closed 50K in one week! My relationship
              with my wife is good. I feel more confident to handle the move we
              are doing to Cincinatti where our family. I&apos;m sleeping well
              listening to Reach for the Stars guided meditations at night., My
              hypnosis sessions by phone at Success Center and the customized
              guided meditations at night are really working for me.
            </p>
            <p>K. M., CEO of Digital Marketing Agency. Temecula, California</p>
          </div>
        </section>
      </section>

      <SiteFooter />
    </main>
  );
}
