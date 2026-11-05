#include <gym/analytics_core.hpp>

namespace gym {

void Accumulator::reset(LoadType load_type) noexcept {
  load_type_ = load_type;
  flags_ = 0;
  max_weight_ = 0;
  max_reps_ = 0;
  min_assistance_ = 0;
  estimated_1rm_ = 0;
  volume_ = 0;
  total_reps_ = 0;
  recorded_count_ = 0;
}

void Accumulator::add_set(double weight_kg, double reps, bool has_weight) noexcept {
  if (!is_valid_load_type(static_cast<int>(load_type_)) ||
      !__builtin_isfinite(reps) || reps <= 0) {
    return;
  }

  recorded_count_ += 1;
  total_reps_ += reps;
  if (reps > max_reps_) max_reps_ = reps;

  if (!has_weight || !__builtin_isfinite(weight_kg)) return;

  if (weight_kg >= 0) {
    // Math.min in JavaScript preserves negative zero, independent of ordering.
    if ((flags_ & HasAssistance) == 0 || weight_kg < min_assistance_ ||
        (weight_kg == 0 && min_assistance_ == 0 && __builtin_signbit(weight_kg))) {
      min_assistance_ = weight_kg;
    }
    flags_ |= HasAssistance;
  }

  if (weight_kg <= 0) return;
  flags_ |= HasPositiveWeight;
  if (weight_kg > max_weight_) max_weight_ = weight_kg;
  volume_ += weight_kg * reps;

  // The bounded check precedes the integer conversion, avoiding undefined
  // conversion for huge values, NaN, or infinity. Fractional reps still count
  // toward max reps and volume, but never enter the Epley model.
  if (reps >= 1 && reps <= 12 &&
      reps == static_cast<double>(static_cast<unsigned int>(reps))) {
    const double estimate = weight_kg * (1 + reps / 30);
    if ((flags_ & HasEstimate) == 0 || estimate > estimated_1rm_) {
      estimated_1rm_ = estimate;
    }
    flags_ |= HasEstimate;
  }
}

bool Accumulator::has_metric(Metric metric_id) const noexcept {
  if (!is_valid_load_type(static_cast<int>(load_type_)) ||
      !is_valid_metric(static_cast<int>(metric_id)) || recorded_count_ == 0) {
    return false;
  }
  if (metric_id == Metric::MaxReps) return true;

  switch (load_type_) {
    case LoadType::Weighted:
      return metric_id == Metric::Estimated1RM
                 ? (flags_ & HasEstimate) != 0
                 : (flags_ & HasPositiveWeight) != 0;
    case LoadType::Bodyweight:
      return false;
    case LoadType::BodyweightAdded:
      return metric_id == Metric::MaxWeight;
    case LoadType::Assisted:
      return metric_id == Metric::MaxWeight && (flags_ & HasAssistance) != 0;
  }
  return false;
}

double Accumulator::metric(Metric metric_id) const noexcept {
  if (!has_metric(metric_id)) return 0;
  switch (metric_id) {
    case Metric::MaxWeight:
      return load_type_ == LoadType::Assisted ? min_assistance_ : max_weight_;
    case Metric::MaxReps:
      return max_reps_;
    case Metric::Estimated1RM:
      return estimated_1rm_;
    case Metric::Volume:
      return volume_;
  }
  return 0;
}

}  // namespace gym

namespace {
gym::Accumulator abi_accumulator;
}

extern "C" {

int gym_abi_version() noexcept { return 1; }

void gym_reset(int load_type) noexcept {
  // Avoid converting arbitrary integers to an enum with unknown values.
  const gym::LoadType safe_type = gym::is_valid_load_type(load_type)
                                      ? static_cast<gym::LoadType>(load_type)
                                      : static_cast<gym::LoadType>(-1);
  abi_accumulator.reset(safe_type);
}

void gym_add_set(double weight_kg, double reps, int has_weight) noexcept {
  abi_accumulator.add_set(weight_kg, reps, has_weight != 0);
}

int gym_has_metric(int metric) noexcept {
  return gym::is_valid_metric(metric) &&
                 abi_accumulator.has_metric(static_cast<gym::Metric>(metric))
             ? 1
             : 0;
}

double gym_metric(int metric) noexcept {
  return gym::is_valid_metric(metric)
             ? abi_accumulator.metric(static_cast<gym::Metric>(metric))
             : 0;
}

double gym_volume() noexcept { return abi_accumulator.volume(); }
double gym_total_reps() noexcept { return abi_accumulator.total_reps(); }
double gym_recorded_count() noexcept { return abi_accumulator.recorded_count(); }

}  // extern "C"
