Explanation

Let me drop all the technical words and start over.

## Think of it as an exam

Three things exist:

1. **The question paper.** The AI reads this. It explains the task.
2. **The AI's answer.** What the AI hands in.
3. **The marking script.** A program that checks the AI's answer and gives it a pass or fail.

**The task:** here are 40,000 customer records. Some are the same person entered twice. Find the duplicates and group them together.

**How do you tell if two records are the same person?** You compare three things: their name, their email, and their phone number. All three have to match.

## The phone number part

Phone numbers get written in different ways. These are the same number:

```
030 555 0199
+49 30 5550199
```

So before you can compare them, you have to tidy each one into a single standard shape. Then compare the tidied versions.

Nobody writes this tidying code by hand. Everyone uses the same free software library for it. The AI used it. The marking script uses it too.

## Now here's the record that breaks everything

There's a customer in Japan. Their phone number is written like this:

```
010 2344 9340
```

You hand that to the library and tell it "this person is in Japan." Here is what actually comes back:

```
country code: 234
number:       49340
```

**234 is Nigeria.**

The library took a Japanese customer's phone number and turned it into a Nigerian one. And only 5 digits long, which is far too short to be anybody's real phone number.

Why did it do that? Because in Japan, when you want to call another country, you dial `010` first. The library saw `010` at the start and thought "this person is calling abroad", threw it away, and read what was left as a foreign number.

It's a bad guess, but the library is doing what it was built to do.

## The actual disagreement

So now you have this junk Nigerian number. You ask the library one last question: **"is this a usable number?"**

The library can answer that question in two ways.

- Ask the **fussy** version, and it says: *"only good enough for a local call."*
- Ask the **relaxed** version, and it says: *"yes, fine."*

Same library. Same number. Two ways of asking, two different answers.

**The marking script asks the relaxed version.** It hears "yes, fine" and keeps the Nigerian number.

**Two of the AI runs asked the fussy version.** They heard "only good for a local call", decided that isn't a real number, and threw it away.

That's the entire bug. One asked fussily, the other asked casually.

## What that does to the result

Here are three real records from the file. Same name, same email:

| id | country | phone written as |
|---|---|---|
| 2689 | Japan | `010 2344 9340` |
| 14808 | France | `09 74 10 11` |
| 37973 | France | `01 98 96 94` |

The two French numbers are too short to be real. Both sides agree: unusable, throw them away.

Record 2689 is the problem one.

- **Marking script:** keeps it as that Nigerian number. So 2689 has a phone and the other two don't. They're different people. **Answer: 2 groups.**
- **The AI:** threw it away. So now all three have no phone. All three look identical. **Answer: 1 group.**

The AI merged two people into one. That happens 11 times across the whole file. So the AI hands in 33,565 groups when the marking script expects 33,576. Fail.

## Why I think the AI was treated unfairly

This is the sentence in the question paper that covers this situation:

> "If the string parses to a well-formed number (a valid country code and **a nationally significant number of plausible length** for that region), the key is its E.164 form."

"Nationally significant" means a proper full-length number for the whole country, not a local shorthand.

Now remember what the library said about our number: **"only good enough for a local call."** That is the exact opposite of nationally significant.

So the question paper is telling the AI to throw it away. The AI threw it away. **The AI did what it was told.**

The same paragraph also says anything "too short to be a plausible number for the region" gets thrown away. Five digits is too short.

And here's the part that settles it for me. The name of that relaxed question, the one the marking script uses, **does not appear anywhere in the question paper.** Not once. So the AI had no way to know that was the one to use.

## Where the broken data even came from

Nobody designed this as a test. It's an accident.

The script that generates the fake customer data does this for Japanese phone numbers:

- pick a random number between 1 and 99
- stick a `0` on the front

Usually harmless. But when it happens to pick **10**, you get `010`, which is the dial-abroad code. Pure coincidence. It happens 11 times out of 40,000.

The tests the author actually meant to set are somewhere else entirely. Things like `Groß` versus `Gross`, or a Russian letter that looks identical to an English one. There are 15 of those.

**Both failing AI runs got all 15 of them right.** They only lost on the accident.

## How I checked, rather than guessed

1. I rebuilt the data file myself. It uses a fixed starting seed, so it comes out identical every time. Got 40,030 records.
2. I ran both versions of the phone tidying over all 40,030 and counted where they disagree. **Exactly 11.** That matches the 33,576 minus 33,565 in the failure log precisely.
3. I looked at all 11. Every one is Japan, every one starts with `010`, every one is random filler. **None** of them is one of the 15 designed tests.
4. I opened all 8 AI runs and checked which version each one used. The two that asked fussily are the two that failed. The other six asked casually and passed. No exceptions.

## If someone asks you what's wrong with this task

> A phone number gets mangled into a fake Nigerian number. The marking script keeps it. Two AI runs threw it away instead, which is what the instructions actually tell you to do. The instructions never say which behaviour is expected, so those two got failed for following them. It only affects 11 records out of 40,000, and those 11 are accidental junk, not real test cases.

## Where to look if you want to see it yourself

| What | File | Line |
|---|---|---|
| The relaxed question the marking script asks | `tests/test_outputs.py` | 101 |
| The sentence in the question paper | `instruction.md` | 45 |
| The accident that makes `010` numbers | `environment/gen_records.py` | 200 |
| Proof the wording never mentions it | run `rg 'is_possible' instruction.md` | no matches |