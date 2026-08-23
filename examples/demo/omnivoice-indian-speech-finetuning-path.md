---
title: OmniVoice Indian Speech Finetuning — Learning Path
subtitle: Hindi, Hinglish, Indian English, and reliable expressive controls
kicker: Learning Path
chips: [OmniVoice, Fine-tuning, Hindi, Hinglish, Evaluation]
format: pack
repo_base: https://github.com/k2-fsa/OmniVoice/blob/master
repo_tree: https://github.com/k2-fsa/OmniVoice/tree/master
repo_paths: omnivoice, docs, examples
---

<!-- pncsy:learn topic="OmniVoice Indian Speech Finetuning" level="advanced" depth="deep" -->

# OmniVoice Indian Speech Finetuning — Learning Path

Build a reproducible adaptation and evaluation pipeline for the official `k2-fsa/OmniVoice` model. The target is not a vague “Indian voice”: it is measured behavior across Hindi, code-switched Hinglish, Indian English, and added non-verbal tags, with held-out speakers and tag-specific tests.

## Snapshot

| Field | Value |
|-------|-------|
| Topic | OmniVoice Indian Speech Finetuning |
| Target level | Advanced |
| Depth | deep |
| Time to target | 6–10 weeks with suitable speech data and GPU access |
| Assumes you know | Python, PyTorch training, speech datasets, and basic TTS evaluation |

## Prerequisites

| Prerequisite | Self-check |
|--------------|------------|
| Speech data handling | Can you pair each audio clip with an exact transcript, speaker ID, language label, and license record? |
| PyTorch and Accelerate | Can you launch and resume a multi-GPU job and inspect a TensorBoard loss curve? |
| Hindi text basics | Can you distinguish Devanagari Hindi, romanized Hindi, English, and code-switched spans? |
| Audio quality control | Can you detect clipping, long silence, transcript mismatch, and sample-rate drift? |
| Experimental design | Can you define speaker-disjoint train, validation, and test splits before training? |

## Level 1 — Basic

### Goals

- Run the official pretrained checkpoint in at least two generation modes
- Confirm Hindi is an upstream language ID and avoid claiming Hinglish as a separate supported language
- Build a frozen baseline set for Hindi, Hinglish, and Indian English
- Exercise every upstream non-verbal tag before adding a new one

### Core concepts

- **Base checkpoint** — `k2-fsa/OmniVoice` is the reference that every adapted checkpoint must beat without silently losing existing behavior
- **Language ID** — upstream lists Hindi as `hi`; Hinglish is a code-switching evaluation condition, not an official language entry
- **Voice cloning** — conditions generation on reference audio and optional reference text
- **Voice design** — conditions generation on documented speaker attributes without reference audio
- **Non-verbal tag** — an inline token such as `[laughter]` whose output depends on learned tagged examples
- **Code switching** — language changes inside one utterance, requiring separate coverage from monolingual Hindi and English
- **Baseline suite** — fixed prompts, seeds, references, and output metadata captured before training
- **License ledger** — source, terms, speaker consent, and redistribution status retained for every clip

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Repository | [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) | Official install, inference modes, supported tags, and command-line examples | 2h |
| Model card | [k2-fsa/OmniVoice on Hugging Face](https://huggingface.co/k2-fsa/OmniVoice) | Official checkpoint identity and minimal inference example | 1h |
| Language list | [Supported languages](https://github.com/k2-fsa/OmniVoice/blob/master/docs/languages.md) | Confirms Hindi ID `hi` and documents upstream training hours | 30m |
| Guide | [Voice design](https://github.com/k2-fsa/OmniVoice/blob/master/docs/voice-design.md) | Documents accepted attribute categories and their limits | 1h |
| Notebook | [Official quick start](https://github.com/k2-fsa/OmniVoice/blob/master/docs/OmniVoice.ipynb) | Reproducible voice cloning, voice design, and auto-voice baseline | 2h |

### Do this

Create a versioned baseline manifest with 12 prompts: three Hindi, three romanized Hinglish, three Indian English, and three tag-bearing controls. Save checkpoint ID, code revision, prompt, language argument, reference-audio provenance, seed, and output path for every result.

## Level 2 — Intermediate

### Goals

- Produce a clean, speaker-disjoint dataset manifest
- Define a tag grammar with one canonical spelling per event
- Preserve Hindi script and romanized code-switch text without destructive normalization
- Launch the official fine-tuning recipe and resume it from a checkpoint

### Core concepts

- **Annotation contract** — exact rules for tag boundaries, overlapping speech, fillers, laughter, and uncertain events
- **Reliable tag label** — an event confirmed from audio rather than inferred from transcript punctuation
- **Text normalization** — controlled transformations that preserve inline tags and code-switch boundaries
- **Speaker-disjoint split** — no speaker appears in both training and evaluation, reducing voice memorization leakage
- **Domain balance** — explicit sampling ratios across Hindi, Hinglish, Indian English, speakers, and tag classes
- **Pretrained initialization** — official `init_from_checkpoint` field used to adapt rather than train from scratch
- **Attention backend** — upstream supports `flex_attention` and the wider-hardware `sdpa` configuration
- **Checkpoint discipline** — save interval, retention, config, data revision, and resume source recorded together

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Guide | [Official training documentation](https://github.com/k2-fsa/OmniVoice/blob/master/docs/training.md) | Defines config files, launch command, pretrained initialization, resume, and TensorBoard | 3h |
| Example | [Fine-tuning runner](https://github.com/k2-fsa/OmniVoice/blob/master/examples/run_finetune.sh) | Shows the official data preparation and training path | 2h |
| Config | [Fine-tuning data config](https://github.com/k2-fsa/OmniVoice/blob/master/examples/config/data_config_finetune.json) | Concrete schema to adapt for a local manifest | 1h |
| Config | [SDPA fine-tuning config](https://github.com/k2-fsa/OmniVoice/blob/master/examples/config/train_config_finetune_sdpa.json) | Official fallback for hardware without `flex_attention` support | 1h |
| Discussion | [Adding non-verbal tags, issue #53](https://github.com/k2-fsa/OmniVoice/issues/53) | Upstream collaborator states that reliable tagged annotations are the key requirement | 30m |

### Do this

Write a dataset audit that reports duration and clip counts by language condition, script, speaker, gender if consented, and tag. Manually review a stratified sample, reject mismatched clips, then run a short official fine-tuning job and prove that resume restores optimizer, scheduler, and step state.

## Level 3 — Advanced

### Goals

- Compare full fine-tuning with the official LoRA route under one evaluation protocol
- Measure tag precision, unwanted tag leakage, intelligibility, and speaker similarity separately
- Detect regressions on plain Hindi and English while improving Hinglish and Indian English targets
- Package a reproducible checkpoint decision with known failure cases

### Core concepts

- **LoRA adaptation** — upstream option that freezes the pretrained LLM backbone while training low-rank adapters and designated audio modules
- **Continuity mix** — untagged baseline speech retained during adaptation to reduce catastrophic forgetting
- **Tag precision** — fraction of requested tags that produce the intended audible event
- **Tag leakage** — non-verbal event appearing when the prompt contains no such tag
- **Intelligibility slice** — word or character error measured separately for Hindi, Hinglish spans, and Indian English
- **Speaker similarity** — whether adaptation preserves reference-speaker identity under voice cloning
- **Ablation** — remove one data source, tag class, or sampling rule to identify what caused a gain
- **Release gate** — explicit thresholds and human listening review required before a checkpoint is promoted

### Resources

| Type | Resource | Why | Time |
|------|----------|-----|------|
| Guide | [Official LoRA fine-tuning documentation](https://github.com/k2-fsa/OmniVoice/blob/master/docs/lora_finetuning.md) | Documents config fields, launch, adapter inference, resume, and merge behavior | 3h |
| Example | [LoRA pipeline](https://github.com/k2-fsa/OmniVoice/blob/master/examples/run_finetune_lora.sh) | Official tokenization and LoRA training entry point | 2h |
| Config | [LoRA fine-tuning config](https://github.com/k2-fsa/OmniVoice/blob/master/examples/config/train_config_finetune_lora.json) | Starting values and adapted module lists | 1h |
| Paper | [OmniVoice paper](https://arxiv.org/abs/2604.00688) | Architecture, multilingual training setup, and reported evaluation context | 4h |
| Paper | [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) | Original method and the trade-off behind parameter-efficient adaptation | 2h |

### Do this

Train matched full and LoRA experiments from the same data revision. Evaluate both against the untouched base model on speaker-disjoint plain speech, code-switched speech, requested tags, and no-tag controls. Promote nothing until results include per-slice metrics, blinded listening notes, and representative failures.

## Videos and courses

| Resource | Creator | Watch for | Skip |
|----------|---------|-----------|------|
| [OmniVoice quick-start notebook](https://colab.research.google.com/github/k2-fsa/OmniVoice/blob/master/docs/OmniVoice.ipynb) | k2-fsa | Executable inference workflow and documented generation modes | Repeating setup once local inference works |
| [Hugging Face Audio Course](https://huggingface.co/learn/audio-course/chapter0/introduction) | Hugging Face | Audio datasets, preprocessing, and model evaluation foundations | ASR-specific deployment sections not needed for TTS adaptation |
| [PyTorch reproducibility notes](https://docs.pytorch.org/docs/stable/notes/randomness.html) | PyTorch | Sources of nondeterminism and realistic reproducibility limits | Backend details irrelevant to the selected hardware |

## Research papers

| Paper | Year | Read for |
|-------|------|----------|
| [OmniVoice: Towards Omnilingual Zero-Shot Text-to-Speech with Diffusion Language Models](https://arxiv.org/abs/2604.00688) | 2026 | Direct text-to-acoustic-token architecture, multilingual scale, and official baseline context |
| [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) | 2021 | Why low-rank updates can reduce trainable parameters while retaining a frozen base |
| [Whisper: Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356) | 2022 | Limits and uses of automatic transcription in a speech-data quality pipeline |

## Common traps

| Trap | What actually breaks | Fix |
|------|----------------------|-----|
| Calling Hinglish “supported” | Upstream lists Hindi and English language IDs, not Hinglish as a distinct language | Treat Hinglish as a custom code-switching dataset and evaluation slice |
| Treating Indian English as one accent | Regional and speaker variation gets collapsed into a misleading average | Declare the covered speaker regions and report each slice |
| Inferring tags from punctuation | Exclamation marks and ellipses are weak proxies for audible events | Annotate from audio with a written event policy and reviewer agreement |
| Random clip split | The same speaker leaks into train and test | Split by speaker before sampling clips |
| Training only tagged clips | Plain speech quality and no-tag behavior regress | Keep a documented continuity mix and no-tag controls |
| Reporting one aggregate score | Gains on English can hide losses on Hindi or code-switched spans | Publish per-language, per-script, per-tag, and no-tag results |
| Changing text normalization silently | Devanagari, romanization, or bracketed tags are altered before tokenization | Version normalization rules and round-trip representative examples |
| Shipping the best checkpoint by loss | Training loss does not establish intelligibility or tag correctness | Gate with objective slices and blinded listening |

## Glossary

| Term | Meaning |
|------|---------|
| Acoustic token | Discrete representation of audio predicted by the model |
| Adaptation | Training a pretrained checkpoint for a narrower data distribution or behavior |
| Code switching | Moving between languages within one utterance |
| Continuity mix | Plain examples mixed into adaptation data to preserve existing speech behavior |
| Devanagari | Script commonly used for written Hindi |
| Full fine-tuning | Updating the model parameters selected by the standard training recipe |
| Hinglish | Hindi–English code-switched speech or text; not a single standardized language ID here |
| Indian English | English speech shaped by Indian linguistic and regional contexts |
| Language ID | Model input code selecting a documented language, such as `hi` for Hindi |
| LoRA | Low-rank trainable updates attached to selected model layers |
| Non-verbal tag | Inline label requesting an audible event such as laughter or a sigh |
| No-tag control | Prompt used to detect accidental expressive-event leakage |
| Romanization | Writing Hindi speech with Latin characters |
| Speaker-disjoint | Speakers in one split do not appear in another |
| Tag leakage | Requested event appears when its tag is absent |
| Tag precision | Requested event is audibly realized when its tag is present |
| Text normalization | Rules that standardize text before tokenization |
| Voice cloning | Generating speech conditioned on reference-speaker audio |
| Voice design | Generating speech from documented speaker-attribute instructions |
| WER | Word error rate used as one intelligibility measure |

## Next

- Publish the dataset card, annotation guide, and evaluation manifest before model weights
- Add human preference testing with native Hindi and Indian English listeners
- Stress-test unseen speakers, long code-switched sentences, repeated tags, and no-tag prompts
- Document checkpoint license, base revision, data rights, hardware, and known failures
