# Cross-repo impact checklist

Puente is one dataset with six consumers. **A change to a shared Parse class is
an API change to every one of them**, whether or not the other repos are open in
your editor.

This exists because it was learned the expensive way: an `organization` pointer
added in `puente-node-cloudcode` would have put six columns of Parse plumbing
(`organization.__type_x`, `.className_y`, …) into every supplementary CSV that
partner coordinators open and funders receive. Nothing in either repo being
changed would have shown it.

Run this whenever a change touches a Parse class, a Cloud Code function
signature, a form-field shape, or an export column.

---

## 1. Is this cross-repo? (usually yes)

It is, if the change does any of:

- adds, renames, retypes, or removes a **field** on a Parse class
- changes an **ACL or CLP**
- changes a **Cloud Code function**'s params or return shape
- adds a **form field type** (Form Creator ↔ Collect's input picker)
- changes anything an **export column** derives from

A new *pointer* field deserves special suspicion: it serialises into three
sub-columns (`.__type`, `.className`, `.objectId`) in anything that flattens.

## 2. Enumerate every consumer, then prove each one

| System | Reads the survey dataset? | What to check |
|---|---|---|
| **`puente-node-cloudcode`** | Yes — owns the write path | Does `postObjectsToClass` / offline sync need to set or skip the field? |
| **`puente-react-nextjs-platform`** (Manage) | Yes | Blind field iteration — `Object.keys/entries`, `.attributes`, `toJSON()`? Would a pointer render as `[object Object]`? |
| **`puente-reactnative-collect`** | Yes, offline-first | Does the edit path write the field back? Does it skip pointers? **Old builds keep sending old shapes for months.** |
| **`puente-flask-rest-aggregator`** | Yes — CSV exports | **`pd.json_normalize` with no allowlist expands pointers into columns.** `main.py`/`mainV3.py` allowlist; `supplementary.py` does not. |
| **`app/modules/django-etl`** (dormant) | Possibly, if revived | Would it need the same resolution rule? Would ACLs make it silently return nothing? |
| **`puente-react-gatsby-website`** | **No** — donor site, not on this dataset | Confirm, don't assume |

For each consumer that reads the class, answer in writing:

1. Does it **enumerate fields blindly**, or against an explicit allowlist?
2. Does it **write the field back** (and would it clobber or drop it)?
3. Does it **render** the field to a human?
4. Would the field's absence break it? *(Backfills are incremental — for a long
   time some records have it and some don't. Both states must work.)*

**Prove it, don't reason about it.** The six-column leak was confirmed by running
the real `cleanRecords` and printing the CSV, not by reading pandas docs.

## 3. Order the DEPLOYS, not the merges

The trap: "merging is safe, deploying is the risky part." **Not here.** Most of
these ship on merge.

| Repo | Merge to… | What merging does | Speed |
|---|---|---|---|
| `puente-flask-rest-aggregator` | `main` | **Auto-deploys to prod** via AWS CodePipeline → EB `flask-api-40-env` | Minutes |
| `puente-node-cloudcode` | `master` | **Auto-deploys to prod Back4App** via GH Actions `deploy.yaml` (b4a CLI), gated on Jest | Minutes |
| `puente-react-nextjs-platform` | `master` | **Auto-deploys to prod** via Vercel. (`deploy.yml` is the dead AWS S3 CD.) | Minutes |
| `puente-reactnative-collect` | — | EAS build + **App Store / Play review**, manual iOS submit | Days–weeks |

Rules that follow:

- **Defensive consumer changes ship BEFORE the producer.** The aggregator fix had
  to be *live*, not merged, before cloudcode could merge — because merging
  cloudcode is deploying it.
- **Verify the deploy landed**, don't assume the merge did it:
  `eb status flask-api-40-env` → `Health: Green` and a `Deployed Version`
  containing your commit SHA.
- **Never sequence a fast train behind Collect.** If a design needs a mobile
  release, look for a server-side seam first — resolving on the server meant no
  Collect release at all, and covered years-old builds and queued offline records.

## 4. Before you call it done

- [ ] Every consumer in §2 checked, with the answer written down
- [ ] Cross-repo effects **reproduced**, not reasoned about
- [ ] Deploy order written down, defensive changes first
- [ ] Each deploy verified live before the next one merges
- [ ] `schema/schema.json` updated if a class or field changed
